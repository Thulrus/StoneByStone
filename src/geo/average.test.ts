import { describe, expect, test } from 'vitest';
import { averageFixes, circleRing, snapToLine } from './average';
import { distanceM, localProjection } from './local';

const proj = localProjection([-72.58, 44.26]);
const fixAt = (x: number, y: number, accuracyM = 5) => {
  const [lng, lat] = proj.toLngLat([x, y]);
  return { lng, lat, accuracyM };
};
const offBy = (p: { lng: number; lat: number }, x: number, y: number) =>
  distanceM([p.lng, p.lat], proj.toLngLat([x, y]));

/** Deterministic noise in [-1, 1). */
const noise = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

describe('averageFixes', () => {
  test('nothing to average', () => {
    expect(averageFixes([])).toBeUndefined();
  });

  test('one fix comes back as is', () => {
    const a = averageFixes([fixAt(3, 4, 6)])!;
    expect(offBy(a, 3, 4)).toBeLessThan(0.01);
    expect(a.accuracyM).toBe(6);
  });

  test('noisy fixes average close to the truth, with a better but honest accuracy', () => {
    const fixes = Array.from({ length: 10 }, (_, i) => fixAt(2 * noise(i), 2 * noise(i + 50), 5));
    const a = averageFixes(fixes)!;
    expect(offBy(a, 0, 0)).toBeLessThan(1);
    expect(a.used).toBe(10);
    // At most twice as good as one 5 m fix, however many fixes there are.
    expect(a.accuracyM).toBeGreaterThanOrEqual(2.5);
    expect(a.accuracyM).toBeLessThan(5);
  });

  test('a far-off jump is rejected', () => {
    const fixes = [
      ...Array.from({ length: 8 }, (_, i) => fixAt(noise(i), noise(i + 9), 4)),
      fixAt(40, -30, 4),
    ];
    const a = averageFixes(fixes)!;
    expect(a.rejected).toBe(1);
    expect(offBy(a, 0, 0)).toBeLessThan(1);
  });

  test('a fix reporting poor accuracy is rejected', () => {
    const fixes = [fixAt(0, 0, 3), fixAt(0.5, 0, 3), fixAt(0, 0.5, 3), fixAt(6, 6, 30)];
    const a = averageFixes(fixes)!;
    expect(a.rejected).toBe(1);
    expect(offBy(a, 0.17, 0.17)).toBeLessThan(0.1);
  });

  test('more accurate fixes weigh more', () => {
    const a = averageFixes([fixAt(0, 0, 2), fixAt(2, 0, 4)])!;
    // weights 1/4 and 1/16: mean x = (0·4 + 2·1) / 5 = 0.4
    expect(offBy(a, 0.4, 0)).toBeLessThan(0.01);
  });

  test('wide scatter is reflected in the accuracy, whatever the phone claims', () => {
    const ring = Array.from({ length: 8 }, (_, i) =>
      fixAt(6 * Math.cos((i * Math.PI) / 4), 6 * Math.sin((i * Math.PI) / 4), 3),
    );
    const a = averageFixes(ring)!;
    expect(a.used).toBe(8);
    expect(a.accuracyM).toBeCloseTo(6, 1);
  });
});

describe('snapToLine', () => {
  const line = [proj.toLngLat([0, 0]), proj.toLngLat([20, 0])];
  test('snaps onto a nearby row', () => {
    const s = snapToLine(line, fixAt(7, 2), 5)!;
    expect(distanceM(s, proj.toLngLat([7, 0]))).toBeLessThan(0.01);
  });
  test('leaves a far fix alone', () => {
    expect(snapToLine(line, fixAt(7, 9), 5)).toBeUndefined();
    expect(snapToLine(undefined, fixAt(7, 0), 5)).toBeUndefined();
  });
});

test('circleRing is closed and has the right radius', () => {
  const ring = circleRing(proj.toLngLat([0, 0]), 4);
  expect(ring[0]).toEqual(ring[ring.length - 1]);
  for (const p of ring) expect(distanceM(p, proj.toLngLat([0, 0]))).toBeCloseTo(4, 2);
});
