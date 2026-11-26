/** Web Mercator (XYZ) tile math for offline downloads (plan §8, §24). */
import type { BBox } from './bbox';
import { localProjection } from './local';

export interface TileXYZ {
  z: number;
  x: number;
  y: number;
}

const MAX_LAT = 85.0511287798066;
const R = 6378137; // Web Mercator sphere radius, m

/** The tile containing a point at zoom `z`. */
export function tileAt(lng: number, lat: number, z: number): TileXYZ {
  const n = 2 ** z;
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n);
  const clamp = (v: number) => Math.max(0, Math.min(n - 1, v));
  return { z, x: clamp(x), y: clamp(y) };
}

/** Every tile covering `bbox` for each zoom in `[zmin, zmax]`, low zooms first. */
export function tilesInBBox(bbox: BBox, zmin: number, zmax: number): TileXYZ[] {
  const out: TileXYZ[] = [];
  for (let z = zmin; z <= zmax; z++) {
    const nw = tileAt(bbox[0], bbox[3], z);
    const se = tileAt(bbox[2], bbox[1], z);
    for (let x = nw.x; x <= se.x; x++) for (let y = nw.y; y <= se.y; y++) out.push({ z, x, y });
  }
  return out;
}

/** Number of tiles `tilesInBBox` would return, without building them. */
export function countTilesInBBox(bbox: BBox, zmin: number, zmax: number): number {
  let n = 0;
  for (let z = zmin; z <= zmax; z++) {
    const nw = tileAt(bbox[0], bbox[3], z);
    const se = tileAt(bbox[2], bbox[1], z);
    n += (se.x - nw.x + 1) * (se.y - nw.y + 1);
  }
  return n;
}

/** Bing-style quadkey. */
export function quadkey({ z, x, y }: TileXYZ): string {
  let key = '';
  for (let i = z; i > 0; i--) {
    const mask = 1 << (i - 1);
    key += String((x & mask ? 1 : 0) + (y & mask ? 2 : 0));
  }
  return key;
}

/** The tile's bounds in EPSG:3857 metres: [minX, minY, maxX, maxY]. */
export function tileBBox3857({ z, x, y }: TileXYZ): BBox {
  const size = (2 * Math.PI * R) / 2 ** z;
  const minX = -Math.PI * R + x * size;
  const maxY = Math.PI * R - y * size;
  return [minX, maxY - size, minX + size, maxY];
}

/** Fill an XYZ / quadkey / WMS-bbox URL template for one tile. */
export function fillTileTemplate(template: string, t: TileXYZ): string {
  return template
    .replaceAll('{z}', String(t.z))
    .replaceAll('{x}', String(t.x))
    .replaceAll('{y}', String(t.y))
    .replaceAll('{quadkey}', quadkey(t))
    .replaceAll('{bbox-epsg-3857}', tileBBox3857(t).join(','));
}

/** `bbox` grown by `metres` on every side. */
export function bufferBBox(bbox: BBox, metres: number): BBox {
  const p = localProjection([(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]);
  const [w, s] = p.toLngLat([
    p.toLocal([bbox[0], bbox[1]])[0] - metres,
    p.toLocal([bbox[0], bbox[1]])[1] - metres,
  ]);
  const [e, n] = p.toLngLat([
    p.toLocal([bbox[2], bbox[3]])[0] + metres,
    p.toLocal([bbox[2], bbox[3]])[1] + metres,
  ]);
  return [w, s, e, n];
}
