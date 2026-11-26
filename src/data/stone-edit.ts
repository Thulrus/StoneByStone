/** Stone detail edits that touch a row's layout (plan §6 stone detail). Each is one undo step. */
import type { ID } from '../domain';
import type { Store } from './store';
import { nextRowIndex, relayoutRow } from './walk';

/** Move a stone to the end of another row (or out of any row), re-spacing both rows. */
export async function moveToRow(store: Store, id: ID, rowId: ID | undefined): Promise<void> {
  await store.run('Move stone to row', async () => {
    const m = await store.monuments.get(id);
    if (!m || m.address?.rowId === rowId) return;
    const from = m.address?.rowId;
    const row = rowId ? await store.rows.get(rowId) : undefined;
    const { rowId: _r, rowIndex: _i, sectionId: _s, ...rest } = m.address ?? {};
    const address = row
      ? {
          ...rest,
          ...(row.sectionId ? { sectionId: row.sectionId } : {}),
          rowId: row.id,
          rowIndex: await nextRowIndex(store, row),
        }
      : rest;
    // A position laid out in the old row means nothing in the new one.
    const position = m.position?.source === 'row-interpolated' ? undefined : m.position;
    await store.monuments.update(id, {
      address: Object.keys(address).length ? address : undefined,
      position,
    });
    if (from) await relayoutRow(store, from);
    if (row) await relayoutRow(store, row.id);
  });
}

/** Forget a stone's position; in a row it goes back to its laid-out place. */
export async function clearPosition(store: Store, id: ID): Promise<void> {
  await store.run('Clear position', async () => {
    const m = await store.monuments.update(id, { position: undefined });
    if (m.address?.rowId) await relayoutRow(store, m.address.rowId);
  });
}
