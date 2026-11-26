/** Placing one stone by hand (GPS averaging, relative placement) and re-spacing its row. */
import type { ID, Position } from '../domain';
import type { Store } from './store';
import { relayoutRow } from './walk';

/** Set a stone's position: one undo step. Its row is re-spaced around it as an anchor. */
export async function placeStone(store: Store, id: ID, position: Position): Promise<void> {
  await store.run('Place stone', async () => {
    const m = await store.monuments.update(id, { position });
    if (m.address?.rowId) await relayoutRow(store, m.address.rowId);
  });
}
