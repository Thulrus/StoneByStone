// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { ImageryProvider } from './imagery';
import { OSM_ID, PRESETS, USGS_ID } from './imagery';
import {
  deleteTiles,
  downloadTiles,
  loadTile,
  offlineArea,
  offlineTemplate,
  planDownload,
  registerOfflineProvider,
} from './offline';

function fakeCaches() {
  const all = new Map<string, Map<string, Response>>();
  return {
    all,
    open: async (name: string) => {
      const c = all.get(name) ?? new Map<string, Response>();
      all.set(name, c);
      return {
        match: async (u: string) => c.get(u)?.clone(),
        put: async (u: string, r: Response) => void c.set(u, r),
        delete: async (u: string) => c.delete(u),
      };
    },
  };
}

const usgs = PRESETS.find((p) => p.id === USGS_ID) as ImageryProvider;
const osm = PRESETS.find((p) => p.id === OSM_ID) as ImageryProvider;
let fetches: string[];
let cs: ReturnType<typeof fakeCaches>;

beforeEach(() => {
  fetches = [];
  cs = fakeCaches();
  vi.stubGlobal('caches', cs);
  vi.stubGlobal('fetch', async (url: string) => {
    fetches.push(url);
    return new Response(new Uint8Array(100), { headers: { 'content-type': 'image/jpeg' } });
  });
});
afterEach(() => vi.unstubAllGlobals());

const area = offlineArea({ location: { lng: -72.6, lat: 43.5 } }, [], [])!;

test('the area falls back to the location, and the plan is capped at the provider zoom', () => {
  expect(area[2] - area[0]).toBeGreaterThan(0);
  const plan = planDownload(area, usgs);
  expect([plan.zmin, plan.zmax]).toEqual([15, 16]);
  expect(plan.count).toBeGreaterThan(0);
  expect(plan.estimateBytes).toBe(plan.count * 20_000);
  expect(offlineArea({}, [], [])).toBeUndefined();
});

test('download fills the cache; the map then reads tiles without the network', async () => {
  const plan = planDownload(area, usgs);
  const progress: number[] = [];
  const r = await downloadTiles(area, plan, usgs, { onProgress: (d) => progress.push(d) });
  expect(r.tiles).toHaveLength(plan.count);
  expect(r.bytes).toBe(plan.count * 100);
  expect(r.failed).toBe(0);
  expect(progress.at(-1)).toBe(plan.count);
  expect(fetches[0]).toMatch(/^https:\/\/basemap\.nationalmap\.gov\/.+\/tile\/\d+\/\d+\/\d+$/);

  fetches = [];
  const [z, x, y] = (r.tiles[0] as string).split('/');
  const tpl = offlineTemplate(usgs.id).replace('{z}', z!).replace('{x}', x!).replace('{y}', y!);
  expect((await loadTile(tpl)).byteLength).toBe(100);
  expect(fetches).toEqual([]);

  await deleteTiles(usgs.id, r.tiles);
  registerOfflineProvider(usgs);
  await loadTile(tpl);
  expect(fetches).toHaveLength(1);
});

test('providers whose terms forbid it are never downloaded', async () => {
  await expect(downloadTiles(area, planDownload(area, osm), osm)).rejects.toThrow();
  expect(fetches).toEqual([]);
});
