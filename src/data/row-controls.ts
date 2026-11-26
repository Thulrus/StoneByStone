/**
 * Row controls (plan §7.2): reverse a row's numbering and move a stone within its row. Each is
 * one undo step and re-spaces the row. Gap, Skip and Insert are options of `captureStone`.
 */
import type { ID } from '../domain';
import type { Store } from './store';
import { relayoutRow, rowLayoutInputs, rowStones, setIndex } from './walk';

/**
 * Number the row from the other end: stone i becomes stone (last − i), gaps included, and the
 * row's line is reversed with it, so nothing moves on the map. A row without a drawn line gets
 * its current line (start → farthest fix), reversed.
 */
export async function reverseRow(store: Store, rowId: ID): Promise<boolean> {
  return store.run('Reverse row', async () => {
    const row = await store.rows.get(rowId);
    if (!row) return false;
    const { stones, line } = await rowLayoutInputs(store, row);
    if (stones.length === 0) return false;
    const last = Math.max(...stones.map((m) => m.address?.rowIndex ?? 0));
    for (const m of stones) await setIndex(store, m, last - (m.address?.rowIndex ?? 0));
    if (line)
      await store.rows.update(rowId, {
        line: { type: 'LineString', coordinates: [...line].reverse() },
      });
    await relayoutRow(store, rowId);
    return true;
  });
}

/**
 * Move a stone one slot towards the row start (`-1`) or end (`+1`). It swaps with the stone in
 * that slot, or just moves if the slot is a gap.
 */
export async function moveStone(store: Store, monumentId: ID, by: -1 | 1): Promise<boolean> {
  return store.run('Move stone', async () => {
    const m = await store.monuments.get(monumentId);
    const rowId = m?.address?.rowId;
    const from = m?.address?.rowIndex;
    if (!m || !rowId || from === undefined) return false;
    const to = from + by;
    if (to < 0) return false;
    const stones = await rowStones(store, { id: rowId, cemeteryId: m.cemeteryId });
    if (by > 0 && !stones.some((s) => (s.address?.rowIndex ?? -1) > from)) return false;
    const other = stones.find((s) => s.address?.rowIndex === to);
    if (other) await setIndex(store, other, from);
    await setIndex(store, m, to);
    await relayoutRow(store, rowId);
    return true;
  });
}
