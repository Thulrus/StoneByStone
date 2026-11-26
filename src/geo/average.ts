/**
 * GPS averaging for "hold still" (plan §7.3): a few seconds of fixes, outliers dropped, a
 * weighted mean, and an accuracy you can trust. Pure; the collection loop lives in the UI.
 */
import { projectOntoLine } from './line';
import { localProjection, type LngLatTuple, type XY } from './local';
import type { RowFix } from './row-layout';

export interface AveragedFix {
  lng: number;
  lat: number;
  /** Estimated 68% radius, metres. */
  accuracyM: number;
  used: number;
  rejected: number;
}

const DEFAULT_ACCURACY_M = 10;
/**
 * GPS errors a few seconds apart are strongly correlated (same satellites, same multipath),
 * so averaging N fixes is nowhere near √N better. We let it improve on one fix by at most this.
 */
const MAX_GAIN = 2;
/** Spread under this is treated as this, so the outlier cut never gets absurdly tight. */
const MIN_SPREAD_M = 1;

const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};

const accOf = (f: RowFix) => Math.max(1, f.accuracyM ?? DEFAULT_ACCURACY_M);

/**
 * Average fixes taken while holding still. Fixes reporting much worse accuracy than is typical
 * for the set, or lying far from its median, are dropped. `undefined` for no fixes.
 */
export function averageFixes(fixes: readonly RowFix[]): AveragedFix | undefined {
  if (fixes.length === 0) return undefined;
  const origin: LngLatTuple = [median(fixes.map((f) => f.lng)), median(fixes.map((f) => f.lat))];
  const proj = localProjection(origin);
  const pts = fixes.map((f) => ({ f, xy: proj.toLocal([f.lng, f.lat]), acc: accOf(f) }));

  // 1. Reported accuracy: drop fixes more than twice as vague as the median fix.
  const accCut = 2 * median(pts.map((p) => p.acc));
  // 2. Distance from the median point: robust spread via the median absolute distance.
  const dist = (xy: XY) => Math.hypot(xy[0], xy[1]);
  const spread = Math.max(MIN_SPREAD_M, median(pts.map((p) => dist(p.xy))));
  const distCut = Math.max(3 * spread, median(pts.map((p) => p.acc)));
  const kept = pts.filter((p) => p.acc <= accCut && dist(p.xy) <= distCut);
  const use = kept.length > 0 ? kept : pts;

  let sw = 0;
  let sx = 0;
  let sy = 0;
  for (const p of use) {
    const w = 1 / p.acc ** 2;
    sw += w;
    sx += w * p.xy[0];
    sy += w * p.xy[1];
  }
  const mean: XY = [sx / sw, sy / sw];
  const rms = Math.sqrt(
    use.reduce((s, p) => s + (p.xy[0] - mean[0]) ** 2 + (p.xy[1] - mean[1]) ** 2, 0) / use.length,
  );
  // Combined reported accuracy (inverse-variance), improved by at most MAX_GAIN.
  const reported = 1 / Math.sqrt(sw);
  const gain = Math.min(MAX_GAIN, Math.sqrt(use.length));
  const accuracyM = Math.max(rms, (reported * Math.sqrt(use.length)) / gain);
  const [lng, lat] = proj.toLngLat(mean);
  return {
    lng,
    lat,
    accuracyM: Math.round(accuracyM * 10) / 10,
    used: use.length,
    rejected: fixes.length - use.length,
  };
}

/**
 * Snap a position onto a row line (plan §7.3: GPS is a hint, the row is the truth) when it
 * lies within `maxOffsetM` of it. Returns the foot point, or `undefined` if too far away.
 */
export function snapToLine(
  line: readonly LngLatTuple[] | undefined,
  p: { lng: number; lat: number },
  maxOffsetM: number,
): [number, number] | undefined {
  if (!line || line.length < 2) return undefined;
  const proj = projectOntoLine(line, [p.lng, p.lat]);
  return Math.abs(proj.offset) <= maxOffsetM ? proj.point : undefined;
}

/** A circle as a closed GeoJSON ring around `center`, `radiusM` metres. */
export function circleRing(center: LngLatTuple, radiusM: number, steps = 48): [number, number][] {
  const proj = localProjection(center);
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (2 * Math.PI * (i % steps)) / steps;
    ring.push(proj.toLngLat([radiusM * Math.cos(a), radiusM * Math.sin(a)]));
  }
  return ring;
}
