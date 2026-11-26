import { expect, test } from 'vitest';
import { distanceM, bearingDeg, localProjection } from './local';
import { anchorOf, relativePosition, rowBearingAt, ROW_ERROR_DEG } from './relative';

const proj = localProjection([-72.58, 44.26]);
const at = (x: number, y: number) => {
  const [lng, lat] = proj.toLngLat([x, y]);
  return { lng, lat };
};

test('offsets by distance and bearing', () => {
  const from = at(0, 0);
  const p = relativePosition({ from: { ...from, accuracyM: 2 }, distanceM: 4, bearingDeg: 90 });
  expect(distanceM([from.lng, from.lat], [p.lng, p.lat])).toBeCloseTo(4, 2);
  expect(bearingDeg([from.lng, from.lat], [p.lng, p.lat])).toBeCloseTo(90, 0);
});

test('accuracy grows with distance and direction roughness, never below the reference', () => {
  const from = { ...at(0, 0), accuracyM: 2 };
  const near = relativePosition({ from, distanceM: 1, bearingDeg: 0 });
  const far = relativePosition({ from, distanceM: 10, bearingDeg: 0 });
  const alongRow = relativePosition({
    from,
    distanceM: 10,
    bearingDeg: 0,
    directionErrorDeg: ROW_ERROR_DEG,
  });
  expect(near.accuracyM).toBeGreaterThanOrEqual(2);
  expect(near.accuracyM).toBeLessThan(2.3);
  expect(far.accuracyM).toBeGreaterThan(4);
  expect(alongRow.accuracyM).toBeLessThan(far.accuracyM);
  // Unknown reference accuracy is taken as 3 m.
  expect(relativePosition({ from: at(0, 0), distanceM: 0, bearingDeg: 0 }).accuracyM).toBe(3);
});

test('row bearing follows the nearest segment', () => {
  const line = [at(0, 0), at(10, 0), at(10, 10)].map((p) => [p.lng, p.lat] as [number, number]);
  expect(rowBearingAt(line, [at(5, 1).lng, at(5, 1).lat])).toBeCloseTo(90, 0);
  expect(rowBearingAt(line, [at(11, 6).lng, at(11, 6).lat])).toBeCloseTo(0, 0);
});

test('anchorOf a point, a polygon, nothing', () => {
  expect(anchorOf({ type: 'Point', coordinates: [1, 2] })).toEqual({ lng: 1, lat: 2 });
  const sq = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
      ],
    ],
  };
  expect(anchorOf(sq)).toEqual({ lng: 1, lat: 1 });
  expect(anchorOf(undefined)).toBeUndefined();
});
