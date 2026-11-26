/** The desk-mode transcription queue (plan §9): pure ordering and filtering. */
import type { ID, Monument, MonumentStatus, Photo, PhotoRole, Row } from '../../domain';

export type QueueFilter = MonumentStatus | 'all';

/** Default: photographed but not transcribed yet. */
export const DEFAULT_FILTER: QueueFilter = 'photographed';

/**
 * Stones in walking order, so families stay together: rows in layout order (sections in
 * order), then position in the row. Stones outside any row come last, by v1 grid cell, then
 * plot label, then when they were made.
 */
export function queueOrder(stones: readonly Monument[], rows: readonly Row[]): Monument[] {
  const rowRank = new Map(rows.map((r, i) => [r.id, i]));
  const key = (m: Monument) => {
    const r = m.address?.rowId;
    const rank = r !== undefined ? rowRank.get(r) : undefined;
    return {
      rank: rank ?? rows.length,
      index: m.address?.rowIndex ?? Number.MAX_SAFE_INTEGER,
      gridRow: m.legacyGrid?.row ?? Number.MAX_SAFE_INTEGER,
      gridCol: m.legacyGrid?.col ?? Number.MAX_SAFE_INTEGER,
      plot: m.address?.plotLabel ?? '',
    };
  };
  const keys = new Map(stones.map((m) => [m.id, key(m)]));
  return [...stones].sort((a, b) => {
    const ka = keys.get(a.id);
    const kb = keys.get(b.id);
    if (!ka || !kb) return 0;
    return (
      ka.rank - kb.rank ||
      ka.index - kb.index ||
      ka.gridRow - kb.gridRow ||
      ka.gridCol - kb.gridCol ||
      ka.plot.localeCompare(kb.plot, undefined, { numeric: true }) ||
      (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)
    );
  });
}

/** The queue's stone ids. A snapshot: saving a stone doesn't pull it out from under you. */
export function buildQueue(
  stones: readonly Monument[],
  rows: readonly Row[],
  filter: QueueFilter,
): ID[] {
  const picked = filter === 'all' ? stones : stones.filter((m) => m.status === filter);
  return queueOrder(picked, rows).map((m) => m.id);
}

/** Up to `n` stones either side of `stone` in its row, in row order (for context). */
export function rowNeighbours(
  stone: Monument,
  stones: readonly Monument[],
  n = 2,
): { before: Monument[]; after: Monument[] } {
  const rowId = stone.address?.rowId;
  const at = stone.address?.rowIndex;
  if (rowId === undefined || at === undefined) return { before: [], after: [] };
  const inRow = stones
    .filter((m) => m.id !== stone.id && m.address?.rowId === rowId)
    .filter((m) => m.address?.rowIndex !== undefined)
    .sort((a, b) => (a.address?.rowIndex ?? 0) - (b.address?.rowIndex ?? 0));
  return {
    before: inRow.filter((m) => (m.address?.rowIndex ?? 0) < at).slice(-n),
    after: inRow.filter((m) => (m.address?.rowIndex ?? 0) > at).slice(0, n),
  };
}

const ROLE_ORDER: readonly PhotoRole[] = ['front', 'back', 'detail', 'context', 'other'];

/** A stone's photos, front first (the one usually read). */
export function photoOrder(photos: readonly Photo[]): Photo[] {
  return [...photos].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
}
