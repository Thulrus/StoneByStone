/**
 * Apply a v2 archive to the store: every record is merged by id (§21.2), the whole import is
 * one history group and one undo step. Cross-ID matching (M6) is not done here.
 */
import type { ID, MergeableRecord } from '../../domain';
import { toBlobRow } from '../blobs';
import { sha256Hex } from '../hash';
import { LAST_SEEN_KEY } from '../device';
import type { Repo } from '../repository';
import type { OpContext, Store } from '../store';
import type { TableName } from '../undo';
import type { Archive, ArchiveData, Binaries } from './archive';
import { emptyBinaries } from './archive';

export interface ImportSummary {
  cemeteryId: ID;
  created: number;
  updated: number;
  unchanged: number;
  photos: number;
  /** Non-fatal problems, e.g. a photo whose bytes don't match its sha256. */
  warnings: string[];
}

/** Parents before children, so derived status sees linked persons and photos. */
const ORDER = [
  'sections',
  'rows',
  'tags',
  'features',
  'overlays',
  'monuments',
  'persons',
  'photos',
] as const satisfies readonly (keyof ArchiveData & TableName)[];

async function putIfAbsent<R extends { id: ID }>(
  store: Store,
  ctx: OpContext,
  table: TableName,
  row: R,
) {
  const t = store.db.table(table);
  if (await t.get(row.id)) return false;
  store.snapshot(ctx, table, row.id, undefined);
  await t.put(row);
  return true;
}

export async function importArchive(
  store: Store,
  archive: Archive,
  binaries: Binaries = emptyBinaries(),
  { label = `Import ${archive.cemetery.name}` } = {},
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    cemeteryId: archive.cemetery.id,
    created: 0,
    updated: 0,
    unchanged: 0,
    photos: 0,
    warnings: [],
  };
  // Hash outside the transaction: IndexedDB transactions can't wait on crypto.
  const verified = new Map<ID, boolean>();
  for (const p of archive.data.photos) {
    const blob = binaries.photos.get(p.id);
    if (blob) verified.set(p.id, (await sha256Hex(blob)) === p.sha256);
  }

  const rows = async (m: Map<ID, Blob>) =>
    Promise.all([...m].map(([id, blob]) => toBlobRow(id, blob)));
  const [photoRows, thumbRows, overlayRows] = await Promise.all([
    rows(binaries.photos),
    rows(binaries.thumbs),
    rows(binaries.overlays),
  ]);

  await store.group(label, 'import', async (ctx) => {
    const count = (r: 'created' | 'updated' | 'unchanged') => summary[r]++;
    for (const c of archive.data.contributors) {
      const existing = await store.db.contributors.get(c.id);
      if (!existing || (!existing.displayName && c.displayName)) {
        store.snapshot(ctx, 'contributors', c.id, existing);
        await store.db.contributors.put(c);
      }
    }
    count(await store.cemeteries.upsertMerged(ctx, archive.cemetery));
    for (const k of ORDER) {
      const repo = store[k] as unknown as Repo<MergeableRecord>;
      for (const r of archive.data[k]) count(await repo.upsertMerged(ctx, r));
    }
    for (const h of archive.data.history) await putIfAbsent(store, ctx, 'history', h);

    for (const row of photoRows) {
      if (verified.get(row.id) === false) {
        summary.warnings.push(`photos/${row.id}.jpg does not match its checksum; skipped`);
        continue;
      }
      if (await putIfAbsent(store, ctx, 'photoBlobs', row)) summary.photos++;
    }
    for (const row of thumbRows) await putIfAbsent(store, ctx, 'photoThumbs', row);
    for (const row of overlayRows) await putIfAbsent(store, ctx, 'overlayBlobs', row);

    store.snapshot(ctx, 'settings', LAST_SEEN_KEY, await store.db.settings.get(LAST_SEEN_KEY));
    await store.noteSeen([
      archive.cemetery,
      ...ORDER.flatMap((k) => archive.data[k] as MergeableRecord[]),
    ]);
  });
  return summary;
}
