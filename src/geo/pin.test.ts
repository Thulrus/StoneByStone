import { describe, expect, test } from 'vitest';
import { cellPolygons, distanceM, fitPins, localProjection, ringArea, toLngLat } from '.';

const proj = localProjection([-72.6, 43.5]);

/** A grid with 2 m cells rotated 30°, pinned at the given cells. */
function truth(x: number, y: number): [number, number] {
  const a = Math.PI / 6;
  const X = 2 * (x * Math.cos(a) + y * Math.sin(a));
  const Y = 2 * (x * Math.sin(a) - y * Math.cos(a)); // y down → map north is up
  return proj.toLngLat([X, Y]);
}
const pin = (x: number, y: number) => {
  const [lng, lat] = truth(x, y);
  return { x, y, lng, lat };
};

describe('fitPins', () => {
  test('two points give an exact similarity, without a mirror', () => {
    const fit = fitPins([pin(0, 0), pin(10, 5)])!;
    expect(fit.method).toBe('similarity');
    expect(fit.rmsM).toBeLessThan(1e-6);
    expect(distanceM(toLngLat(fit.transform, [3, 7]), truth(3, 7))).toBeLessThan(0.01);
  });

  test('three or more give an affine with residuals in metres', () => {
    const pts = [pin(0, 0), pin(20, 0), pin(0, 15), pin(20, 15)];
    pts[3] = { ...pts[3]!, lng: pts[3]!.lng + 2 / 80_000 }; // ~2 m error east
    const fit = fitPins(pts)!;
    expect(fit.method).toBe('affine');
    expect(fit.residuals).toHaveLength(4);
    expect(fit.rmsM).toBeGreaterThan(0.3);
    expect(fit.rmsM).toBeLessThan(2);
    expect(distanceM(toLngLat(fit.transform, [10, 7]), truth(10, 7))).toBeLessThan(1.5);
  });

  test('too few or collinear points give no fit', () => {
    expect(fitPins([pin(0, 0)])).toBeUndefined();
    expect(fitPins([pin(0, 0), pin(1, 1), pin(2, 2)])).toBeUndefined();
  });
});

describe('cellPolygons', () => {
  test('one cell is one square', () => {
    const polys = cellPolygons([{ row: 2, col: 3 }]);
    expect(polys).toHaveLength(1);
    expect(polys[0]).toHaveLength(1);
    expect(Math.abs(ringArea(polys[0]![0]!))).toBe(1);
    expect(polys[0]![0]).toHaveLength(5);
  });

  test('an L of cells merges into one ring of six corners', () => {
    const polys = cellPolygons([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);
    expect(polys).toHaveLength(1);
    expect(polys[0]![0]).toHaveLength(7);
    expect(Math.abs(ringArea(polys[0]![0]!))).toBe(3);
  });

  test('a ring of cells has a hole; separate cells are separate polygons', () => {
    const ring = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) if (r !== 1 || c !== 1) ring.push({ row: r, col: c });
    const polys = cellPolygons([...ring, { row: 10, col: 10 }]);
    expect(polys).toHaveLength(2);
    const withHole = polys.find((p) => p.length === 2)!;
    expect(Math.abs(ringArea(withHole[0]!))).toBe(9);
    expect(Math.abs(ringArea(withHole[1]!))).toBe(1);
  });
});
