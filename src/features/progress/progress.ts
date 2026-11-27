/**
 * Progress dashboard numbers (plan §11): stones at each status per section and row, and the
 * needs-revisit list for the next field trip. Pure, so the counting is tested.
 */
import type { ID, Monument, MonumentStatus, Row, Section } from '../../domain';
import { queueOrder } from '../transcribe/queue';

export const STATUSES: readonly MonumentStatus[] = [
  'located',
  'photographed',
  'transcribed',
  'verified',
];

export type StatusCounts = Record<MonumentStatus, number> & { total: number };

export interface RowProgress {
  row: Row;
  counts: StatusCounts;
}

export interface SectionProgress {
  /** `undefined`: rows with no section. */
  section: Section | undefined;
  counts: StatusCounts;
  rows: RowProgress[];
}

export interface Progress {
  counts: StatusCounts;
  sections: SectionProgress[];
  /** Stones in no (live) row. */
  unplaced: StatusCounts;
}

export function emptyCounts(): StatusCounts {
  return { total: 0, located: 0, photographed: 0, transcribed: 0, verified: 0 };
}

function add(c: StatusCounts, status: MonumentStatus) {
  c[status] += 1;
  c.total += 1;
}

/** Whole percent of `c` at `status` (0 for none). Rounded down, so 100 means all. */
export function percent(c: StatusCounts, status: MonumentStatus): number {
  return c.total === 0 ? 0 : Math.floor((c[status] * 100) / c.total);
}

/** Whole percent transcribed or verified. */
export function donePercent(c: StatusCounts): number {
  return c.total === 0 ? 0 : Math.floor(((c.transcribed + c.verified) * 100) / c.total);
}

/**
 * Counts per section and row. Sections come in the given order with their rows; rows with no
 * (live) section form a leading group with `section: undefined`, left out when empty.
 */
export function buildProgress(
  stones: readonly Monument[],
  sections: readonly Section[],
  rowsBySection: ReadonlyMap<ID | null, readonly Row[]>,
): Progress {
  const byRow = new Map<ID, StatusCounts>();
  const counts = emptyCounts();
  const unplaced = emptyCounts();
  const live = new Set([...rowsBySection.values()].flat().map((r) => r.id));
  for (const m of stones) {
    if (m.deleted) continue;
    add(counts, m.status);
    const rowId = m.address?.rowId;
    if (rowId === undefined || !live.has(rowId)) {
      add(unplaced, m.status);
      continue;
    }
    let c = byRow.get(rowId);
    if (!c) byRow.set(rowId, (c = emptyCounts()));
    add(c, m.status);
  }
  const group = (section: Section | undefined, rows: readonly Row[]): SectionProgress => {
    const total = emptyCounts();
    const out = rows.map((row) => {
      const c = byRow.get(row.id) ?? emptyCounts();
      for (const s of STATUSES) total[s] += c[s];
      total.total += c.total;
      return { row, counts: c };
    });
    return { section, counts: total, rows: out };
  };
  const loose = rowsBySection.get(null) ?? [];
  const result: SectionProgress[] = loose.length > 0 ? [group(undefined, loose)] : [];
  for (const s of sections) result.push(group(s, rowsBySection.get(s.id) ?? []));
  return { counts, sections: result, unplaced };
}

export const REVISIT_FLAG = 'needs-revisit';

/** Live stones flagged needs-revisit, in walking order (as the transcription queue). */
export function revisitList(stones: readonly Monument[], rows: readonly Row[]): Monument[] {
  return queueOrder(
    stones.filter((m) => !m.deleted && m.flags?.includes(REVISIT_FLAG)),
    rows,
  );
}
