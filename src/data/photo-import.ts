/**
 * Writes for a bulk photo import (plan §20.3): each planned stone becomes a stone with its
 * photos, all as one undo step. With no row, a stone is placed at its first photo's GPS. Given
 * a row, the stones go after the row's last one in time order and the row is laid out again
 * as on a walk: the photos' GPS fixes are fitted along the row in order.
 */
import type { ID, Monument, PhotoRole, Position } from '../domain';
import { writePhoto, type PreparedPhoto } from './photos';
import type { Store } from './store';
import { nextRowIndex, relayoutRow } from './walk';

/** sha256 of every photo the cemetery already has, so a folder can be imported again. */
export async function cemeteryPhotoHashes(store: Store, cemeteryId: ID): Promise<Set<string>> {
  const photos = await store.photos.listByCemetery(cemeteryId);
  return new Set(photos.map((p) => p.sha256));
}

export interface PhotoImportOptions {
  rowId?: ID;
  label: string;
}

/** Adds the stones and photos; returns the new stones in order. */
export async function importPhotoStones(
  store: Store,
  cemeteryId: ID,
  stones: readonly (readonly PreparedPhoto[])[],
  { rowId, label }: PhotoImportOptions,
): Promise<Monument[]> {
  return store.group(label, 'import', async (ctx) => {
    const row = rowId ? await store.rows.get(rowId) : undefined;
    let index = row ? await nextRowIndex(store, row) : 0;
    const made: Monument[] = [];
    for (const photos of stones) {
      const fix = photos.find((p) => p.record.position)?.record.position;
      const position: Position | undefined = fix && !row ? { ...fix, source: 'gps' } : undefined;
      const m = await store.monuments.create({
        cemeteryId,
        kind: 'headstone',
        ...(position ? { position } : {}),
        ...(row
          ? {
              address: {
                ...(row.sectionId ? { sectionId: row.sectionId } : {}),
                rowId: row.id,
                rowIndex: index++,
              },
            }
          : {}),
      });
      for (const [i, p] of photos.entries()) {
        const role: PhotoRole = i === 0 ? 'front' : 'other';
        await writePhoto(store, ctx, cemeteryId, {
          ...p,
          record: { ...p.record, monumentId: m.id, role },
        });
      }
      made.push(m);
    }
    if (row) await relayoutRow(store, row.id);
    return made;
  });
}
