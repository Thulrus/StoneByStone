/** Polylines in a local metric frame: length, projection of a point, point at a distance. */
import { at, localProjection, type LngLatTuple, type LocalProjection, type XY } from './local';

export interface LineProjection {
  /** Distance along the line to the foot point, metres (0 … length). */
  along: number;
  /** Signed perpendicular distance, metres; positive is left of the line's direction. */
  offset: number;
  /** The foot point, [lng, lat]. */
  point: [number, number];
  /** Index of the segment the foot point lies on. */
  segment: number;
}

function frame(line: readonly LngLatTuple[], proj?: LocalProjection) {
  if (line.length < 2) throw new Error('A line needs at least two points');
  const p = proj ?? localProjection(at(line, 0));
  return { p, pts: line.map((q) => p.toLocal(q)) };
}

function segLen(a: XY, b: XY): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Total length in metres. */
export function lineLength(line: readonly LngLatTuple[]): number {
  const { pts } = frame(line);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += segLen(at(pts, i - 1), at(pts, i));
  return len;
}

/** The closest point on the line to `q`, with its distance along the line and offset. */
export function projectOntoLine(line: readonly LngLatTuple[], q: LngLatTuple): LineProjection {
  const { p, pts } = frame(line);
  const [qx, qy] = p.toLocal(q);
  let best: LineProjection | undefined;
  let bestD = Infinity;
  let start = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = at(pts, i - 1);
    const [bx, by] = at(pts, i);
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((qx - ax) * dx + (qy - ay) * dy) / l2));
    const fx = ax + t * dx;
    const fy = ay + t * dy;
    const d = Math.hypot(qx - fx, qy - fy);
    const l = Math.sqrt(l2);
    if (d < bestD - 1e-9) {
      bestD = d;
      const cross = l === 0 ? 0 : (dx * (qy - ay) - dy * (qx - ax)) / l;
      best = { along: start + t * l, offset: cross, point: p.toLngLat([fx, fy]), segment: i - 1 };
    }
    start += l;
  }
  if (!best) throw new Error('unreachable');
  return best;
}

/** The point `distance` metres along the line, clamped to its ends. */
export function pointAlong(line: readonly LngLatTuple[], distance: number): [number, number] {
  const { p, pts } = frame(line);
  let left = Math.max(0, distance);
  for (let i = 1; i < pts.length; i++) {
    const a = at(pts, i - 1);
    const b = at(pts, i);
    const l = segLen(a, b);
    if (left <= l || i === pts.length - 1) {
      const t = l === 0 ? 0 : Math.min(1, left / l);
      return p.toLngLat([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
    left -= l;
  }
  return p.toLngLat(at(pts, 0));
}
