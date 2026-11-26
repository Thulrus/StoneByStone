/**
 * The union of grid cells as polygons (plan §22.4: v1 roads and landmarks become polygons).
 * Cells are unit squares, column `col` spanning x ∈ [col, col+1] and row `row` spanning
 * y ∈ [row, row+1] (y down). Shared edges cancel; the rest are chained into rings.
 */
import type { XY } from './local';

export interface Cell {
  row: number;
  col: number;
}

/** Rings in source coordinates: outer rings and holes, each closed (first = last). */
export function cellRings(cells: readonly Cell[]): XY[][] {
  const set = new Set(cells.map((c) => `${c.row},${c.col}`));
  // Directed edges with the cell on the left (counter-clockwise in a y-up view).
  const edges = new Map<string, XY[]>();
  const add = (a: XY, b: XY) => {
    const k = `${a[0]},${a[1]}`;
    edges.set(k, [...(edges.get(k) ?? []), b]);
  };
  for (const key of set) {
    const [r = 0, c = 0] = key.split(',').map(Number);
    if (!set.has(`${r + 1},${c}`)) add([c, r + 1], [c + 1, r + 1]);
    if (!set.has(`${r},${c + 1}`)) add([c + 1, r + 1], [c + 1, r]);
    if (!set.has(`${r - 1},${c}`)) add([c + 1, r], [c, r]);
    if (!set.has(`${r},${c - 1}`)) add([c, r], [c, r + 1]);
  }
  const rings: XY[][] = [];
  for (const [start, outs] of edges) {
    while (outs.length) {
      const [sx, sy] = start.split(',').map(Number) as [number, number];
      const ring: XY[] = [[sx, sy]];
      let cur = outs.pop() as XY;
      while (`${cur[0]},${cur[1]}` !== start) {
        ring.push(cur);
        const next = edges.get(`${cur[0]},${cur[1]}`);
        const n = next?.pop();
        if (!n) break;
        cur = n;
      }
      ring.push([sx, sy]);
      rings.push(simplify(ring));
    }
  }
  return rings;
}

/** Drop vertices in the middle of straight runs. */
function simplify(ring: XY[]): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const prev = ring[(i - 1 + ring.length - 1) % (ring.length - 1)] as XY;
    const p = ring[i] as XY;
    const next = ring[i + 1] as XY;
    const cross = (p[0] - prev[0]) * (next[1] - p[1]) - (p[1] - prev[1]) * (next[0] - p[0]);
    if (cross !== 0) out.push(p);
  }
  out.push(out[0] as XY);
  return out;
}

/** Signed area (shoelace); in the y-down source frame, outer rings come out negative. */
export function ringArea(ring: readonly XY[]): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const p = ring[i] as XY;
    const q = ring[i + 1] as XY;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

function inside(p: XY, ring: readonly XY[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    const a = ring[i] as XY;
    const b = ring[j] as XY;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      hit = !hit;
  }
  return hit;
}

/** Group rings into polygons: each hole goes with the smallest outer ring containing it. */
export function cellPolygons(cells: readonly Cell[]): XY[][][] {
  const rings = cellRings(cells);
  const sign = Math.sign(
    ringArea(
      rings.reduce(
        (big, r) => (Math.abs(ringArea(r)) > Math.abs(ringArea(big)) ? r : big),
        rings[0] ?? [],
      ),
    ),
  );
  const outers = rings.filter((r) => Math.sign(ringArea(r)) === sign);
  const holes = rings.filter((r) => Math.sign(ringArea(r)) !== sign);
  const polys = outers.map((o) => [o]);
  for (const h of holes) {
    const probe = h[0] as XY;
    // A hole vertex lies on the outer ring's grid lines; test a point just inside the hole.
    const owner = polys
      .filter(
        (p) =>
          inside([probe[0] + 1e-6, probe[1] + 1e-6], p[0] as XY[]) ||
          inside([probe[0] - 1e-6, probe[1] - 1e-6], p[0] as XY[]),
      )
      .sort((a, b) => Math.abs(ringArea(a[0] as XY[])) - Math.abs(ringArea(b[0] as XY[])))[0];
    owner?.push(h);
  }
  return polys;
}
