/** Storage used per cemetery (plan §14 storage dashboard). */
import type { ID } from '../domain';
import type { Store } from './store';
import { rowSize } from './blobs';

export interface CemeteryUsage {
  cemeteryId: ID;
  name: string;
  /** Tombstoned: hidden from Home, but its records are kept (and still take space). */
  deleted: boolean;
  /** Approximate size of the records and history, as JSON. */
  dataBytes: number;
  /** Full-size photos, thumbnails, and overlay images. */
  photoBytes: number;
}

const ENTITY_TABLES = [
  'sections',
  'rows',
  'monuments',
  'persons',
  'photos',
  'features',
  'overlays',
  'tags',
  'history',
] as const;

const encoder = new TextEncoder();
const jsonBytes = (v: unknown) => encoder.encode(JSON.stringify(v)).length;

/** Usage of every cemetery on the device, deleted ones included (they still take space). */
export async function storageUsage(store: Store): Promise<CemeteryUsage[]> {
  const db = store.db;
  return db.transaction('r', db.tables, async () => {
    const out: CemeteryUsage[] = [];
    for (const c of await db.cemeteries.toArray()) {
      let dataBytes = jsonBytes(c);
      for (const t of ENTITY_TABLES) {
        await db
          .table(t)
          .where('cemeteryId')
          .equals(c.id)
          .each((r: unknown) => (dataBytes += jsonBytes(r)));
      }
      let photoBytes = 0;
      const photos = await db.photos.where('cemeteryId').equals(c.id).primaryKeys();
      for (const table of [db.photoBlobs, db.photoThumbs]) {
        for (const row of await table.bulkGet(photos)) photoBytes += rowSize(row);
      }
      const overlays = await db.overlays.where('cemeteryId').equals(c.id).toArray();
      const images = overlays.flatMap((o) => (o.imageId ? [o.imageId] : []));
      for (const row of await db.overlayBlobs.bulkGet(images)) photoBytes += rowSize(row);
      out.push({ cemeteryId: c.id, name: c.name, deleted: !!c.deleted, dataBytes, photoBytes });
    }
    return out.sort((a, b) => b.dataBytes + b.photoBytes - (a.dataBytes + a.photoBytes));
  });
}
