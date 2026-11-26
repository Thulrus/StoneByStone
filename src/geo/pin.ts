/**
 * Pinning a picture onto the map (plan §7.4, §22.4): fit control points given in a y-down
 * source frame (image pixels, v1 grid cells) to map positions. Two points give a similarity
 * (no shear, no mirror); three or more a least-squares affine. The fit runs in a local metric
 * frame, so residuals are metres; the returned transform maps source → [lng, lat] directly
 * (the local frame is linear in lng/lat, so this is exact).
 */
import { localProjection, type LngLatTuple, type XY } from './local';
import { applyAffine, fitAffine, fitSimilarity, type Affine, type ControlPair } from './transform';

export interface SourcePoint {
  /** Source coordinates, y pointing down (pixels, or grid columns/rows). */
  x: number;
  y: number;
  lng: number;
  lat: number;
}

export interface PinFit {
  /** Source (x, y-down) → [lng, lat]. */
  transform: Affine;
  /** Metres, per point. */
  residuals: number[];
  rmsM: number;
  method: 'similarity' | 'affine';
}

export function fitPins(points: readonly SourcePoint[]): PinFit | undefined {
  if (points.length < 2) return undefined;
  const n = points.length;
  const origin: [number, number] = [
    points.reduce((s, p) => s + p.lng, 0) / n,
    points.reduce((s, p) => s + p.lat, 0) / n,
  ];
  const proj = localProjection(origin);
  // Flip y so the source frame has the same handedness as the map.
  const pairs: ControlPair[] = points.map((p) => ({
    from: [p.x, -p.y],
    to: proj.toLocal([p.lng, p.lat]),
  }));
  const method = n === 2 ? 'similarity' : 'affine';
  const fit = method === 'similarity' ? fitSimilarity(pairs) : fitAffine(pairs);
  if (!fit) return undefined;
  const [a, b, c, d, e, f] = fit.transform;
  // local (X, Y) → lng/lat is lng0 + X/kx, lat0 + Y/ky.
  const [lngX] = proj.toLngLat([1, 0]);
  const [, latY] = proj.toLngLat([0, 1]);
  const ix = lngX - origin[0];
  const iy = latY - origin[1];
  const transform: Affine = [
    a * ix,
    -b * ix,
    c * ix + origin[0],
    d * iy,
    -e * iy,
    f * iy + origin[1],
  ];
  return { transform, residuals: fit.residuals, rmsM: fit.rms, method };
}

/** Source point → [lng, lat] with a fitted transform. */
export function toLngLat(t: Affine, p: XY): [number, number] {
  return applyAffine(t, p);
}

/** The four corners of a `w × h` source, in MapLibre image-source order (TL, TR, BR, BL). */
export function cornersOf(
  t: Affine,
  w: number,
  h: number,
): [LngLatTuple, LngLatTuple, LngLatTuple, LngLatTuple] {
  return [toLngLat(t, [0, 0]), toLngLat(t, [w, 0]), toLngLat(t, [w, h]), toLngLat(t, [0, h])];
}
