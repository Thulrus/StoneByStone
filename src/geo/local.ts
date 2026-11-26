/**
 * Local metric frame (plan §7): a tangent-plane approximation around an origin, accurate to
 * well under a centimetre over a cemetery-sized area (a few km). x is metres east, y metres
 * north. Pure functions; no map library.
 */
import type { Position } from 'geojson';

/** [lng, lat] in degrees. */
export type LngLatTuple = [number, number] | Position;
/** [x, y] in metres in a local frame. */
export type XY = [number, number];

const A = 6378137; // WGS84 semi-major axis
const E2 = 0.00669437999014; // WGS84 first eccentricity squared
const DEG = Math.PI / 180;
const MEAN_RADIUS = 6371008.8;

/** Longitude of a GeoJSON position (which TypeScript types as `number[]`). */
export const lngOf = (p: LngLatTuple): number => p[0] as number;
/** Latitude of a GeoJSON position. */
export const latOf = (p: LngLatTuple): number => p[1] as number;

/** Element `i`, which the caller has bounds-checked. */
export function at<T>(xs: readonly T[], i: number): T {
  return xs[i] as T;
}

export interface LocalProjection {
  origin: [number, number];
  toLocal(p: LngLatTuple): XY;
  toLngLat(p: XY): [number, number];
}

/** Equirectangular projection scaled by the ellipsoid's radii of curvature at `origin`. */
export function localProjection(origin: LngLatTuple): LocalProjection {
  const lng0 = lngOf(origin);
  const lat0 = latOf(origin);
  const s = Math.sin(lat0 * DEG);
  const w = 1 - E2 * s * s;
  const m = (A * (1 - E2)) / (w * Math.sqrt(w)); // meridional radius
  const n = A / Math.sqrt(w); // prime-vertical radius
  const kx = n * Math.cos(lat0 * DEG) * DEG;
  const ky = m * DEG;
  return {
    origin: [lng0, lat0],
    toLocal: (p) => [(lngOf(p) - lng0) * kx, (latOf(p) - lat0) * ky],
    toLngLat: ([x, y]) => [lng0 + x / kx, lat0 + y / ky],
  };
}

/**
 * Distance in metres. Up to 20 km it uses the ellipsoidal local frame at the midpoint (≈mm
 * accurate); beyond that, the spherical haversine (≈0.5 % accurate).
 */
export function distanceM(a: LngLatTuple, b: LngLatTuple): number {
  if (Math.abs(latOf(b) - latOf(a)) < 0.18 && Math.abs(normalizeDeg(lngOf(b) - lngOf(a))) < 0.18) {
    const mid: [number, number] = [(lngOf(a) + lngOf(b)) / 2, (latOf(a) + latOf(b)) / 2];
    const p = localProjection(mid);
    const [ax, ay] = p.toLocal(a);
    const [bx, by] = p.toLocal(b);
    return Math.hypot(bx - ax, by - ay);
  }
  const dLat = (latOf(b) - latOf(a)) * DEG;
  const dLng = (lngOf(b) - lngOf(a)) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latOf(a) * DEG) * Math.cos(latOf(b) * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * MEAN_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Normalize an angle in degrees to (-180, 180]. */
export function normalizeDeg(d: number): number {
  const r = ((((d + 180) % 360) + 360) % 360) - 180;
  return r === -180 ? 180 : r;
}

/** Initial bearing from a to b, degrees clockwise from north, in (-180, 180]. */
export function bearingDeg(a: LngLatTuple, b: LngLatTuple): number {
  const [x, y] = localProjection(a).toLocal(b);
  return normalizeDeg(Math.atan2(x, y) / DEG);
}
