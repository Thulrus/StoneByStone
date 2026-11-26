/**
 * Relative placement (plan §7.6): "2 m behind stone 14". A point is offset from a reference by
 * a paced or estimated distance and a rough direction, and its accuracy says how rough.
 */
import { projectOntoLine } from './line';
import { bearingDeg, localProjection, type LngLatTuple } from './local';

/** Uncertainty of a compass-point direction (8 points: ±22.5°). */
export const COMPASS_ERROR_DEG = 22.5;
/** Uncertainty of "along / across the row", which follows a real line. */
export const ROW_ERROR_DEG = 15;
/** Paced or eyeballed distances are good to about this fraction. */
const DISTANCE_ERROR = 0.1;
/** References without an accuracy (hand-placed on imagery) are taken as this good. */
const DEFAULT_REF_ACCURACY_M = 3;

export interface RelativeInput {
  from: { lng: number; lat: number; accuracyM?: number | undefined };
  distanceM: number;
  /** Compass bearing from the reference, degrees clockwise from north. */
  bearingDeg: number;
  directionErrorDeg?: number;
}

export function relativePosition({
  from,
  distanceM,
  bearingDeg: bearing,
  directionErrorDeg = COMPASS_ERROR_DEG,
}: RelativeInput): { lng: number; lat: number; accuracyM: number } {
  const proj = localProjection([from.lng, from.lat]);
  const rad = (bearing * Math.PI) / 180;
  const [lng, lat] = proj.toLngLat([distanceM * Math.sin(rad), distanceM * Math.cos(rad)]);
  const ref = from.accuracyM ?? DEFAULT_REF_ACCURACY_M;
  const along = DISTANCE_ERROR * distanceM;
  const across = distanceM * Math.sin((directionErrorDeg * Math.PI) / 180);
  const accuracyM = Math.sqrt(ref ** 2 + along ** 2 + across ** 2);
  return { lng, lat, accuracyM: Math.round(accuracyM * 10) / 10 };
}

/** Direction of a row line where it passes `near`, compass degrees (start → end). */
export function rowBearingAt(line: readonly LngLatTuple[], near: LngLatTuple): number {
  const { segment } = projectOntoLine(line, near);
  const a = line[segment];
  const b = line[segment + 1];
  return a && b ? bearingDeg(a, b) : 0;
}

/** A point to measure from for any GeoJSON geometry: the point itself, else the vertex mean. */
export function anchorOf(geometry: { type: string; coordinates?: unknown } | undefined) {
  if (!geometry || !('coordinates' in geometry)) return undefined;
  const pts: [number, number][] = [];
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === 'number') pts.push([c[0], c[1] as number]);
    else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(geometry.coordinates);
  if (pts.length === 0) return undefined;
  const sum = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
  return { lng: sum[0] / pts.length, lat: sum[1] / pts.length };
}
