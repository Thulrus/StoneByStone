/** Collect a cemetery's records into an `Archive` (plan §20). */
import { canonicalJson, type ID, type MergeableRecord } from '../../domain';
import type { Store } from '../store';
import { rowBlob } from '../blobs';
import {
  APP_VERSION,
  COLLECTION_NAMES,
  FORMAT,
  FORMAT_VERSION,
  emptyBinaries,
  type Archive,
  type ArchiveData,
  type Binaries,
} from './archive';

const byId = <T extends { id: ID }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function writers(records: readonly MergeableRecord[]): Set<ID> {
  const ids = new Set<ID>();
  for (const r of records) {
    for (const s of Object.values(r.stamps)) ids.add(s.by);
    if (r.deleted) ids.add(r.deleted.by);
  }
  return ids;
}

export interface ExportOptions {
  /** Include full-size photos (default true). Thumbnails are always included. */
  photos?: boolean;
  now?: Date;
}

/** Everything for one cemetery, tombstones and history included. */
export async function collectArchive(
  store: Store,
  cemeteryId: ID,
  { photos = true, now = new Date() }: ExportOptions = {},
): Promise<{ archive: Archive; binaries: Binaries }> {
  const db = store.db;
  return db.transaction('r', db.tables, async () => {
    const cemetery = await db.cemeteries.get(cemeteryId);
    if (!cemetery) throw new Error(`Cemetery ${cemeteryId} not found`);
    const where = { includeDeleted: true };
    const data: ArchiveData = {
      sections: await store.sections.listByCemetery(cemeteryId, where),
      rows: await store.rows.listByCemetery(cemeteryId, where),
      monuments: await store.monuments.listByCemetery(cemeteryId, where),
      persons: await store.persons.listByCemetery(cemeteryId, where),
      photos: await store.photos.listByCemetery(cemeteryId, where),
      features: await store.features.listByCemetery(cemeteryId, where),
      overlays: await store.overlays.listByCemetery(cemeteryId, where),
      tags: await store.tags.listByCemetery(cemeteryId, where),
      contributors: [],
      history: await db.history.where('cemeteryId').equals(cemeteryId).toArray(),
    };
    const stamped = [
      cemetery,
      ...COLLECTION_NAMES.flatMap((k) =>
        k === 'contributors' || k === 'history' ? [] : (data[k] as MergeableRecord[]),
      ),
    ];
    const people = writers(stamped);
    for (const id of cemetery.contributors) people.add(id);
    for (const h of data.history) people.add(h.by);
    people.add(store.device.contributorId);
    data.contributors = (await db.contributors.bulkGet([...people])).filter((c) => c !== undefined);
    for (const k of COLLECTION_NAMES) (data[k] as { id: ID }[]).sort(byId);

    const binaries = emptyBinaries();
    for (const p of data.photos) {
      const full = photos ? await db.photoBlobs.get(p.id) : undefined;
      const thumb = await db.photoThumbs.get(p.id);
      const fullBlob = rowBlob(full);
      const thumbBlob = rowBlob(thumb);
      if (fullBlob) binaries.photos.set(p.id, fullBlob);
      if (thumbBlob) binaries.thumbs.set(p.id, thumbBlob);
    }
    for (const o of data.overlays) {
      if (!o.imageId) continue;
      const img = await db.overlayBlobs.get(o.imageId);
      const imgBlob = rowBlob(img);
      if (imgBlob) binaries.overlays.set(o.imageId, imgBlob);
    }

    const me = (await db.contributors.get(store.device.contributorId)) ?? {
      id: store.device.contributorId,
      displayName: '',
    };
    const counts = Object.fromEntries(COLLECTION_NAMES.map((k) => [k, data[k].length]));
    const archive: Archive = {
      manifest: {
        format: FORMAT,
        formatVersion: FORMAT_VERSION,
        appVersion: APP_VERSION,
        kind: 'full',
        cemeteryId,
        createdAt: now.toISOString(),
        createdBy: me,
        counts,
        photoQuality: photos ? cemetery.settings.photoMaxPx : 0,
      },
      cemetery,
      data,
    };
    return { archive, binaries };
  });
}

/** Pretty JSON with sorted keys, so archives diff cleanly. */
export function prettyJson(value: unknown): string {
  return `${JSON.stringify(JSON.parse(canonicalJson(value)), null, 2)}\n`;
}
