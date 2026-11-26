/** Bounding boxes and point-in-polygon for GeoJSON geometry. */
import type { Geometry, Position } from 'geojson';
import { latOf, lngOf } from './local';

/** [west, south, east, north] */
export type BBox = [number, number, number, number];

function eachPosition(g: Geometry, f: (p: Position) => void): void {
  switch (g.type) {
    case 'Point':
      f(g.coordinates);
      break;
    case 'MultiPoint':
    case 'LineString':
      g.coordinates.forEach(f);
      break;
    case 'MultiLineString':
    case 'Polygon':
      g.coordinates.forEach((r) => r.forEach(f));
      break;
    case 'MultiPolygon':
      g.coordinates.forEach((p) => p.forEach((r) => r.forEach(f)));
      break;
    case 'GeometryCollection':
      g.geometries.forEach((x) => eachPosition(x, f));
  }
}

/** The box around all positions, or `undefined` when there are none. */
export function bboxOf(geoms: readonly (Geometry | undefined)[]): BBox | undefined {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity; // prettier-ignore
  for (const g of geoms) {
    if (!g) continue;
    eachPosition(g, (p) => {
      w = Math.min(w, lngOf(p));
      e = Math.max(e, lngOf(p));
      s = Math.min(s, latOf(p));
      n = Math.max(n, latOf(p));
    });
  }
  return w <= e ? [w, s, e, n] : undefined;
}

function inRing(ring: readonly Position[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = lngOf(ring[i] as Position);
    const yi = latOf(ring[i] as Position);
    const xj = lngOf(ring[j] as Position);
    const yj = latOf(ring[j] as Position);
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Whether `p` is inside a Polygon or MultiPolygon (holes excluded). */
export function pointInPolygon(p: Position, g: Geometry): boolean {
  const x = lngOf(p);
  const y = latOf(p);
  const polys =
    g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  return polys.some(
    ([outer, ...holes]) => !!outer && inRing(outer, x, y) && !holes.some((h) => inRing(h, x, y)),
  );
}
