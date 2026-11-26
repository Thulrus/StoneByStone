/**
 * Records of offline tile downloads (plan §8, §24). The tiles themselves live in Cache
 * Storage (one cache per imagery source); these rows say which cemetery downloaded which
 * tiles, so deleting one cemetery's download keeps tiles another cemetery still needs.
 * Device-local: never exported.
 */
import type { ID } from '../domain';
import type { Store } from './store';

export interface TileDownload {
  /** `<cemeteryId>|<providerId>` */
  id: string;
  cemeteryId: ID;
  providerId: string;
  /** `"z/x/y"` of every tile stored. */
  tiles: string[];
  bytes: number;
  /** ISO 8601. */
  downloadedAt: string;
}

export const downloadId = (cemeteryId: ID, providerId: string) => `${cemeteryId}|${providerId}`;

export async function listTileDownloads(store: Store): Promise<TileDownload[]> {
  return (await store.db.tileMeta.toArray()) as unknown as TileDownload[];
}

export async function getTileDownload(
  store: Store,
  cemeteryId: ID,
  providerId: string,
): Promise<TileDownload | undefined> {
  return (await store.db.tileMeta.get(downloadId(cemeteryId, providerId))) as
    TileDownload | undefined;
}

export async function putTileDownload(store: Store, d: TileDownload): Promise<void> {
  await store.db.tileMeta.put({ ...d });
}

/**
 * Forget a download. Returns the tiles no other download still uses, which the caller
 * removes from the cache.
 */
export async function removeTileDownload(store: Store, id: string): Promise<string[]> {
  return store.db.transaction('rw', store.db.tileMeta, async () => {
    const d = (await store.db.tileMeta.get(id)) as TileDownload | undefined;
    if (!d) return [];
    await store.db.tileMeta.delete(id);
    const others = (await store.db.tileMeta.toArray()) as unknown as TileDownload[];
    const kept = new Set(
      others.filter((o) => o.providerId === d.providerId).flatMap((o) => o.tiles),
    );
    return d.tiles.filter((t) => !kept.has(t));
  });
}
