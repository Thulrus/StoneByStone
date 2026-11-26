/** Pure layout for the schematic view (plan §7.5): no coordinates needed. */
import type { ID, Monument } from '../../domain';

/** A row's stones in walking order; `null` marks a skipped `rowIndex` (a gap). */
export type Slot = Monument | null;

export interface SchematicGroups {
  byRow: Map<ID, Slot[]>;
  /** v1 grid stones not yet assigned to a row, keyed `"row,col"`. */
  grid: Map<string, Monument[]>;
  /** Everything else. */
  loose: Monument[];
}

export const cellKey = (c: { row: number; col: number }) => `${c.row},${c.col}`;

/** Stones without an index go after the indexed ones, oldest first. */
function rowSlots(stones: Monument[]): Slot[] {
  const indexed = stones
    .filter((m) => m.address?.rowIndex !== undefined)
    .sort((a, b) => (a.address?.rowIndex ?? 0) - (b.address?.rowIndex ?? 0));
  const rest = stones
    .filter((m) => m.address?.rowIndex === undefined)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const out: Slot[] = [];
  let next = indexed[0]?.address?.rowIndex ?? 0;
  for (const m of indexed) {
    const i = m.address?.rowIndex ?? 0;
    // Show at most a few gap slots, so a typo'd index can't make a row miles long.
    for (let g = 0; g < Math.min(i - next, 5); g++) out.push(null);
    out.push(m);
    next = i + 1;
  }
  return [...out, ...rest];
}

export function groupStones(stones: readonly Monument[], rowIds: ReadonlySet<ID>): SchematicGroups {
  const rows = new Map<ID, Monument[]>();
  const grid = new Map<string, Monument[]>();
  const loose: Monument[] = [];
  for (const m of stones) {
    const rowId = m.address?.rowId;
    if (rowId && rowIds.has(rowId)) {
      const list = rows.get(rowId) ?? [];
      list.push(m);
      rows.set(rowId, list);
    } else if (m.legacyGrid) {
      const k = cellKey(m.legacyGrid);
      grid.set(k, [...(grid.get(k) ?? []), m]);
    } else loose.push(m);
  }
  const byRow = new Map<ID, Slot[]>();
  for (const [id, list] of rows) byRow.set(id, rowSlots(list));
  return { byRow, grid, loose };
}

/** Whether anything can be drawn on a map: a row line or a placed stone. */
export function hasCoordinates(
  rows: readonly { line?: unknown }[],
  stones: readonly Pick<Monument, 'position'>[],
): boolean {
  return rows.some((r) => r.line) || stones.some((m) => m.position);
}
