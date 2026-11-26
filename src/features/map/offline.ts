/**
 * Offline imagery (plan §8, §24): download a cemetery's area into Cache Storage and serve
 * those tiles to the map first. Only providers whose terms allow it (`allowsOffline`: USGS
 * and custom sources the user vouched for) are ever cached; OSM and Esri never are.
 */
import {
  bboxOf,
  bufferBBox,
  countTilesInBBox,
  fillTileTemplate,
  tilesInBBox,
  type BBox,
  type TileXYZ,
} from '../../geo';
import type { Cemetery, Monument, Row } from '../../domain';
import type { ImageryProvider } from './imagery';

export const OFFLINE_PROTOCOL = 'sbs-tile';
export const MIN_ZOOM = 15;
export const MAX_ZOOM = 20;
/** Metres added around the cemetery. */
export const BUFFER_M = 40;
/** Refuse anything bigger: this is for one cemetery, not a region. */
export const MAX_TILES = 4000;
/** Used for a location with no boundary, rows or stones. */
const POINT_RADIUS_M = 150;

export const cacheName = (providerId: string) => `sbs-tiles-${providerId}`;
const tileKey = (t: TileXYZ) => `${t.z}/${t.x}/${t.y}`;
/** Cache keys are synthetic, so a template change doesn't orphan the cache. */
const cacheUrl = (providerId: string, key: string) =>
  `https://offline.invalid/${encodeURIComponent(providerId)}/${key}`;

/** The area to download: boundary, row lines and stones, else around the location. */
export function offlineArea(
  cemetery: Pick<Cemetery, 'boundary' | 'location'>,
  rows: readonly Pick<Row, 'line'>[],
  stones: readonly Pick<Monument, 'position'>[],
): BBox | undefined {
  const placed = stones.flatMap((m) => (m.position ? [[m.position.lng, m.position.lat]] : []));
  const box = bboxOf([
    cemetery.boundary,
    ...rows.map((r) => r.line),
    placed.length ? { type: 'MultiPoint', coordinates: placed } : undefined,
  ]);
  if (box) return bufferBBox(box, BUFFER_M);
  const loc = cemetery.location;
  return loc ? bufferBBox([loc.lng, loc.lat, loc.lng, loc.lat], POINT_RADIUS_M) : undefined;
}

export interface DownloadPlan {
  zmin: number;
  zmax: number;
  count: number;
  estimateBytes: number;
}

/** Zooms 15–20, capped at the provider's own max (MapLibre over-zooms past it). */
export function planDownload(area: BBox, provider: ImageryProvider): DownloadPlan {
  const zmax = Math.min(MAX_ZOOM, provider.maxzoom);
  const zmin = Math.min(MIN_ZOOM, zmax);
  const count = countTilesInBBox(area, zmin, zmax);
  // Typical JPEG aerial tile sizes.
  const perTile = provider.tileSize === 512 ? 60_000 : 20_000;
  return { zmin, zmax, count, estimateBytes: count * perTile };
}

export interface DownloadResult {
  tiles: string[];
  bytes: number;
  failed: number;
}

/** Download every tile of the plan into the provider's cache. */
export async function downloadTiles(
  area: BBox,
  plan: DownloadPlan,
  provider: ImageryProvider,
  opts: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
): Promise<DownloadResult> {
  if (!provider.allowsOffline) throw new Error(`${provider.id} may not be stored offline`);
  const template = provider.tiles[0];
  if (!template) throw new Error('provider has no tile URL');
  const cache = await caches.open(cacheName(provider.id));
  const queue = tilesInBBox(area, plan.zmin, plan.zmax);
  const total = queue.length;
  const result: DownloadResult = { tiles: [], bytes: 0, failed: 0 };
  let done = 0;

  const one = async (t: TileXYZ) => {
    const key = tileKey(t);
    const url = cacheUrl(provider.id, key);
    const have = await cache.match(url);
    if (have) {
      result.tiles.push(key);
      result.bytes += (await have.clone().blob()).size;
      return;
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(fillTileTemplate(template, t), { signal: opts.signal });
        if (!res.ok) continue;
        const blob = await res.blob();
        const type = res.headers.get('content-type') ?? 'image/jpeg';
        await cache.put(url, new Response(blob, { headers: { 'content-type': type } }));
        result.tiles.push(key);
        result.bytes += blob.size;
        return;
      } catch (e) {
        if (opts.signal?.aborted) throw e;
      }
    }
    result.failed++;
  };

  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      opts.signal?.throwIfAborted();
      await one(t);
      opts.onProgress?.(++done, total);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return result;
}

/** Remove tiles (`"z/x/y"`) from a provider's cache. */
export async function deleteTiles(providerId: string, tiles: readonly string[]): Promise<void> {
  const cache = await caches.open(cacheName(providerId));
  await Promise.all(tiles.map((k) => cache.delete(cacheUrl(providerId, k))));
}

/** Tile URL templates the map is given for an offline-capable provider. */
export const offlineTemplate = (providerId: string) =>
  `${OFFLINE_PROTOCOL}://${encodeURIComponent(providerId)}/{z}/{x}/{y}`;

/** Real URL templates by provider id, filled in by the map before it asks for tiles. */
const templates = new Map<string, string>();
export const registerOfflineProvider = (p: ImageryProvider) => {
  if (p.tiles[0]) templates.set(p.id, p.tiles[0]);
};

/** Load one tile for the map: from the offline cache if it's there, else the network. */
export async function loadTile(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const m = /^[a-z-]+:\/\/([^/]+)\/(\d+)\/(\d+)\/(\d+)$/.exec(url);
  if (!m) throw new Error(`bad tile url ${url}`);
  const providerId = decodeURIComponent(m[1] ?? '');
  const t = { z: Number(m[2]), x: Number(m[3]), y: Number(m[4]) };
  if (typeof caches !== 'undefined') {
    const cache = await caches.open(cacheName(providerId));
    const hit = await cache.match(cacheUrl(providerId, tileKey(t)));
    if (hit) return hit.arrayBuffer();
  }
  const template = templates.get(providerId);
  if (!template) throw new Error(`unknown provider ${providerId}`);
  const res = await fetch(fillTileTemplate(template, t), { signal });
  if (!res.ok) throw new Error(`tile ${res.status}`);
  return res.arrayBuffer();
}
