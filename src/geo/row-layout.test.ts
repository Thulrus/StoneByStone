import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { distanceM, localProjection } from './local';
import { effectiveRowLine, isotonic, layoutRow, type RowSlot } from './row-layout';

const origin: [number, number] = [-72.58, 44.26];
const proj = localProjection(origin);
/** A 30 m row running east-north-east. */
const LINE = [proj.toLngLat([0, 0]), proj.toLngLat([28, 10.7])];
const LEN = Math.hypot(28, 10.7);
const truth = (i: number, k: number): [number, number] =>
  proj.toLngLat([(28 * i) / (k - 1), (10.7 * i) / (k - 1)]);

const slots = (k: number, f?: (i: number) => Partial<RowSlot>): RowSlot[] =>
  Array.from({ length: k }, (_, i) => ({ index: i, ...f?.(i) }));

const increasing = (xs: number[]) => xs.every((x, i) => i === 0 || x > (xs[i - 1] ?? -Infinity));

describe('isotonic', () => {
  test('pools violators by weight', () => {
    expect(isotonic([1, 3, 2, 4], [1, 1, 1, 1])).toEqual([1, 2.5, 2.5, 4]);
    expect(isotonic([5, 1], [3, 1])).toEqual([4, 4]);
    expect(isotonic([], [])).toEqual([]);
  });

  test('is non-decreasing and keeps the weighted mean', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.double({ min: -100, max: 100, noNaN: true }),
            fc.double({ min: 0.1, max: 10, noNaN: true }),
          ),
          { minLength: 1, maxLength: 40 },
        ),
        (pairs) => {
          const v = pairs.map((p) => p[0]);
          const w = pairs.map((p) => p[1]);
          const out = isotonic(v, w);
          for (let i = 1; i < out.length; i++)
            expect(out[i]).toBeGreaterThanOrEqual((out[i - 1] ?? 0) - 1e-9);
          const mean = (xs: number[]) => xs.reduce((s, x, i) => s + x * (w[i] ?? 0), 0);
          expect(mean(out)).toBeCloseTo(mean(v), 6);
        },
      ),
    );
  });
});

describe('layoutRow', () => {
  test('with no GPS, stones are spread evenly from start to end, in order', () => {
    const out = layoutRow(LINE, slots(7));
    expect(out.map((p) => p.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    out.forEach((p, i) => expect(p.along).toBeCloseTo((LEN * i) / 6, 6));
    expect(distanceM(out[0]!.point, LINE[0]!)).toBeLessThan(1e-6);
    expect(distanceM(out[6]!.point, LINE[1]!)).toBeLessThan(1e-6);
    expect(out.every((p) => p.accuracyM === undefined)).toBe(true);
  });

  test('a single stone sits at the row start', () => {
    expect(layoutRow(LINE, slots(1))[0]!.along).toBe(0);
  });

  test('gaps keep their slot', () => {
    const out = layoutRow(LINE, [{ index: 0 }, { index: 1 }, { index: 3 }]);
    expect(out[2]!.along).toBeCloseTo(LEN, 6);
    expect(out[1]!.along).toBeCloseTo(LEN / 3, 6);
    expect(layoutRow(LINE, [{ index: 0 }], { slotCount: 5 })[0]!.along).toBe(0);
  });

  test('accurate fixes put stones where they are', () => {
    const k = 12;
    const out = layoutRow(
      LINE,
      slots(k, (i) => {
        const [lng, lat] = truth(i, k);
        return { fix: { lng, lat, accuracyM: 1 } };
      }),
    );
    out.forEach((p, i) => expect(distanceM(p.point, truth(i, k))).toBeLessThan(0.01));
    expect(out[3]!.accuracyM).toBe(1);
  });

  test('noisy GPS never reorders stones (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 40 }),
        fc.array(
          fc.tuple(
            fc.double({ min: -8, max: 8, noNaN: true }),
            fc.double({ min: -8, max: 8, noNaN: true }),
            fc.boolean(),
            fc.double({ min: 2, max: 15, noNaN: true }),
          ),
          { minLength: 40, maxLength: 40 },
        ),
        (k, noise) => {
          const out = layoutRow(
            LINE,
            slots(k, (i) => {
              const [dx, dy, has, acc] = noise[i]!;
              if (!has) return {};
              const [x, y] = proj.toLocal(truth(i, k));
              const [lng, lat] = proj.toLngLat([x + dx, y + dy]);
              return { fix: { lng, lat, accuracyM: acc } };
            }),
          );
          expect(increasing(out.map((p) => p.along))).toBe(true);
          expect(out.every((p) => p.along >= 0 && p.along <= LEN + 1e-9)).toBe(true);
        },
      ),
    );
  });

  test('a reversed pair of fixes is pooled, not swapped', () => {
    const at = (x: number) => {
      const [lng, lat] = proj.toLngLat([x * 0.934, x * 0.357]);
      return { fix: { lng, lat, accuracyM: 5 } };
    };
    const out = layoutRow(LINE, [
      { index: 0, ...at(2) },
      { index: 1, ...at(10) },
      { index: 2, ...at(8) },
      { index: 3, ...at(20) },
    ]);
    expect(increasing(out.map((p) => p.along))).toBe(true);
    expect(out[1]!.along).toBeLessThan(out[2]!.along);
    expect(out[2]!.along - out[1]!.along).toBeCloseTo(0.5, 6);
  });

  test('fixes far off the line are ignored; hand-placed stones anchor', () => {
    const [lng, lat] = proj.toLngLat([10, 60]);
    const off = layoutRow(
      LINE,
      slots(3, (i) => (i === 1 ? { fix: { lng, lat } } : {})),
    );
    expect(off[1]!.along).toBeCloseTo(LEN / 2, 6);
    const [pl, pa] = proj.toLngLat([0.934 * 5, 0.357 * 5]);
    const placed = layoutRow(
      LINE,
      slots(3, (i) => (i === 1 ? { placed: { lng: pl, lat: pa } } : {})),
    );
    expect(placed[1]!.along).toBeCloseTo(5, 3);
  });
});

describe('effectiveRowLine', () => {
  const a = { lng: LINE[0]![0], lat: LINE[0]![1] };
  const b = { lng: LINE[1]![0], lat: LINE[1]![1] };
  test('prefers the drawn line, then start → end, then start → farthest fix', () => {
    expect(effectiveRowLine(LINE)).toEqual(LINE);
    expect(effectiveRowLine(undefined, a, b)).toEqual(LINE);
    const near = { lng: a.lng + 1e-6, lat: a.lat };
    expect(effectiveRowLine(undefined, a, undefined, [near, b])).toEqual(LINE);
    expect(effectiveRowLine(undefined, a, undefined, [near])).toBeUndefined();
    expect(effectiveRowLine(undefined)).toBeUndefined();
  });
});
