/**
 * 2-D transforms fitted from control-point pairs (plan §7.4, §7.7, §21.4):
 * least-squares affine (plat overlays, legacy grid) and least-squares similarity — the 2-D
 * closed form of Umeyama's method, without reflection — for aligning datasets.
 * Points are in any planar frame (pixels, or metres from `localProjection`).
 */
import type { XY } from './local';

/** x' = a·x + b·y + c,  y' = d·x + e·y + f */
export type Affine = readonly [a: number, b: number, c: number, d: number, e: number, f: number];

export interface ControlPair {
  from: XY;
  to: XY;
}

export interface Fit {
  transform: Affine;
  /** Distance between each transformed `from` and its `to`, in `to` units. */
  residuals: number[];
  /** Root-mean-square of the residuals. */
  rms: number;
}

export interface SimilarityFit extends Fit {
  scale: number;
  /** Counter-clockwise rotation, radians. */
  rotation: number;
  translation: XY;
}

export const IDENTITY: Affine = [1, 0, 0, 0, 1, 0];

export function applyAffine(t: Affine, [x, y]: XY): XY {
  return [t[0] * x + t[1] * y + t[2], t[3] * x + t[4] * y + t[5]];
}

/** The inverse transform, or `undefined` when the transform is singular. */
export function invertAffine(t: Affine): Affine | undefined {
  const [a, b, c, d, e, f] = t;
  const det = a * e - b * d;
  if (Math.abs(det) < 1e-12 * (Math.abs(a * e) + Math.abs(b * d) || 1)) return undefined;
  const ia = e / det;
  const ib = -b / det;
  const id = -d / det;
  const ie = a / det;
  return [ia, ib, -(ia * c + ib * f), id, ie, -(id * c + ie * f)];
}

/** Composition: apply `first`, then `second`. */
export function composeAffine(second: Affine, first: Affine): Affine {
  const [a1, b1, c1, d1, e1, f1] = first;
  const [a2, b2, c2, d2, e2, f2] = second;
  return [
    a2 * a1 + b2 * d1,
    a2 * b1 + b2 * e1,
    a2 * c1 + b2 * f1 + c2,
    d2 * a1 + e2 * d1,
    d2 * b1 + e2 * e1,
    d2 * c1 + e2 * f1 + f2,
  ];
}

export function residuals(
  t: Affine,
  pairs: readonly ControlPair[],
): { residuals: number[]; rms: number } {
  const r = pairs.map(({ from, to }) => {
    const [x, y] = applyAffine(t, from);
    return Math.hypot(x - to[0], y - to[1]);
  });
  const rms = r.length ? Math.sqrt(r.reduce((s, v) => s + v * v, 0) / r.length) : 0;
  return { residuals: r, rms };
}

function centroids(pairs: readonly ControlPair[]) {
  const n = pairs.length;
  let fx = 0, fy = 0, tx = 0, ty = 0; // prettier-ignore
  for (const { from, to } of pairs) {
    fx += from[0];
    fy += from[1];
    tx += to[0];
    ty += to[1];
  }
  return { mf: [fx / n, fy / n] as XY, mt: [tx / n, ty / n] as XY };
}

/**
 * Least-squares affine from ≥3 pairs. Returns `undefined` when the `from` points are too few
 * or (nearly) collinear, since the fit is then not determined.
 */
export function fitAffine(pairs: readonly ControlPair[]): Fit | undefined {
  if (pairs.length < 3) return undefined;
  const { mf, mt } = centroids(pairs);
  let sxx = 0, sxy = 0, syy = 0, sxu = 0, syu = 0, sxv = 0, syv = 0; // prettier-ignore
  for (const { from, to } of pairs) {
    const x = from[0] - mf[0];
    const y = from[1] - mf[1];
    const u = to[0] - mt[0];
    const v = to[1] - mt[1];
    sxx += x * x;
    sxy += x * y;
    syy += y * y;
    sxu += x * u;
    syu += y * u;
    sxv += x * v;
    syv += y * v;
  }
  const det = sxx * syy - sxy * sxy;
  // Relative test: det / (trace²) is 0 for collinear points and 1/4 for a well-spread set.
  if (!(det > 1e-10 * (sxx + syy) ** 2)) return undefined;
  const a = (sxu * syy - syu * sxy) / det;
  const b = (syu * sxx - sxu * sxy) / det;
  const d = (sxv * syy - syv * sxy) / det;
  const e = (syv * sxx - sxv * sxy) / det;
  const t: Affine = [a, b, mt[0] - a * mf[0] - b * mf[1], d, e, mt[1] - d * mf[0] - e * mf[1]];
  return { transform: t, ...residuals(t, pairs) };
}

/**
 * Least-squares similarity (rotation + uniform scale + translation) from ≥2 pairs, or a rigid
 * transform with `{ scale: false }`. `undefined` when the `from` points coincide.
 */
export function fitSimilarity(
  pairs: readonly ControlPair[],
  { scale: allowScale = true }: { scale?: boolean } = {},
): SimilarityFit | undefined {
  if (pairs.length < 2) return undefined;
  const { mf, mt } = centroids(pairs);
  let sa = 0, sb = 0, sp = 0; // prettier-ignore
  for (const { from, to } of pairs) {
    const px = from[0] - mf[0];
    const py = from[1] - mf[1];
    const qx = to[0] - mt[0];
    const qy = to[1] - mt[1];
    sa += px * qx + py * qy;
    sb += px * qy - py * qx;
    sp += px * px + py * py;
  }
  if (!(sp > 0)) return undefined;
  const rotation = Math.atan2(sb, sa);
  const s = allowScale ? Math.hypot(sa, sb) / sp : 1;
  const c = s * Math.cos(rotation);
  const n = s * Math.sin(rotation);
  const translation: XY = [mt[0] - (c * mf[0] - n * mf[1]), mt[1] - (n * mf[0] + c * mf[1])];
  const t: Affine = [c, -n, translation[0], n, c, translation[1]];
  return { transform: t, scale: s, rotation, translation, ...residuals(t, pairs) };
}
