import fc from 'fast-check';
import {
  applyAffine,
  bboxOf,
  pointInPolygon,
  bearingDeg,
  composeAffine,
  distanceM,
  fitAffine,
  fitSimilarity,
  IDENTITY,
  invertAffine,
  lineLength,
  localProjection,
  meanAxisBearing,
  normalizeDeg,
  pointAlong,
  projectOntoLine,
  rowsHorizontalBearing,
  type Affine,
  type ControlPair,
  type XY,
} from '.';

/** Deterministic noise (mulberry32 + Box–Muller). */
function rng(seed: number) {
  let a = seed >>> 0;
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u());
}

const close = (a: readonly number[], b: readonly number[], eps: number) =>
  a.forEach((v, i) => expect(Math.abs(v - b[i]!)).toBeLessThan(eps));

describe('local projection', () => {
  const origin: [number, number] = [-72.68, 43.47]; // Vermont
  const p = localProjection(origin);

  it('round-trips', () => {
    const q: [number, number] = [-72.679, 43.4712];
    close(p.toLngLat(p.toLocal(q)), q, 1e-12);
  });

  it('agrees with great-circle distance at cemetery scale', () => {
    for (const q of [
      [-72.678, 43.471],
      [-72.69, 43.465],
      [-72.68, 43.48],
    ] as [number, number][]) {
      const [x, y] = p.toLocal(q);
      expect(Math.abs(Math.hypot(x, y) - distanceM(origin, q))).toBeLessThan(0.05);
    }
  });

  it('measures a degree of latitude near 111 km', () => {
    expect(distanceM([0, 0], [0, 1]) / 111195).toBeCloseTo(1, 2);
    // A known short distance: 0.001° of latitude at 45° is 111.13 m on WGS84.
    expect(distanceM([0, 45], [0, 45.001])).toBeCloseTo(111.13, 1);
  });

  it('gives bearings clockwise from north', () => {
    expect(bearingDeg(origin, [origin[0], origin[1] + 0.001])).toBeCloseTo(0, 6);
    expect(bearingDeg(origin, [origin[0] + 0.001, origin[1]])).toBeCloseTo(90, 6);
    expect(bearingDeg(origin, [origin[0], origin[1] - 0.001])).toBeCloseTo(180, 6);
    expect(bearingDeg(origin, [origin[0] - 0.001, origin[1]])).toBeCloseTo(-90, 6);
  });

  it('normalizes angles to (-180, 180]', () => {
    expect(normalizeDeg(-180)).toBe(180);
    expect(normalizeDeg(540)).toBe(180);
    expect(normalizeDeg(-190)).toBe(170);
    expect(normalizeDeg(370)).toBe(10);
  });
});

describe('lines', () => {
  const o = localProjection([10, 50]);
  // An L: 30 m east, then 40 m north.
  const line = (
    [
      [0, 0],
      [30, 0],
      [30, 40],
    ] as XY[]
  ).map((xy) => o.toLngLat(xy));

  it('measures length', () => {
    expect(lineLength(line)).toBeCloseTo(70, 3);
  });

  it('projects a point onto the nearest segment with a signed offset', () => {
    const left = projectOntoLine(line, o.toLngLat([10, 5]));
    expect(left.along).toBeCloseTo(10, 3);
    expect(left.offset).toBeCloseTo(5, 3);
    expect(left.segment).toBe(0);
    const right = projectOntoLine(line, o.toLngLat([33, 20]));
    expect(right.along).toBeCloseTo(50, 3);
    expect(right.offset).toBeCloseTo(-3, 3);
    expect(right.segment).toBe(1);
    close(o.toLocal(right.point), [30, 20], 1e-3);
  });

  it('clamps beyond the ends', () => {
    expect(projectOntoLine(line, o.toLngLat([-5, 0])).along).toBeCloseTo(0, 6);
    expect(projectOntoLine(line, o.toLngLat([30, 50])).along).toBeCloseTo(70, 3);
  });

  it('finds the point at a distance', () => {
    close(o.toLocal(pointAlong(line, 45)), [30, 15], 1e-3);
    close(o.toLocal(pointAlong(line, -1)), [0, 0], 1e-6);
    close(o.toLocal(pointAlong(line, 999)), [30, 40], 1e-3);
  });

  it('projecting pointAlong returns the same distance', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 70, noNaN: true }), (d) => {
        expect(Math.abs(projectOntoLine(line, pointAlong(line, d)).along - d)).toBeLessThan(1e-3);
      }),
    );
  });

  it('rejects a one-point line', () => {
    expect(() => lineLength([[0, 0]])).toThrow();
  });
});

describe('affine fit', () => {
  const known: Affine = [1.5, 0.3, 100, -0.2, 0.9, -40];
  const grid: XY[] = [
    [0, 0],
    [100, 0],
    [0, 80],
    [100, 80],
    [50, 40],
    [20, 70],
  ];

  it('recovers an exact transform with zero residuals', () => {
    const fit = fitAffine(grid.map((from) => ({ from, to: applyAffine(known, from) })))!;
    close(fit.transform, known, 1e-9);
    expect(fit.rms).toBeLessThan(1e-9);
  });

  it('is exact through three points', () => {
    const pairs = grid.slice(0, 3).map((from) => ({ from, to: applyAffine(known, from) }));
    close(fitAffine(pairs)!.transform, known, 1e-9);
  });

  it('averages out noise, with residuals near the noise level', () => {
    const noise = rng(7);
    const sigma = 0.5;
    const pairs: ControlPair[] = [];
    for (let i = 0; i < 200; i++) {
      const from: XY = [(i * 37) % 100, (i * 53) % 80];
      const [x, y] = applyAffine(known, from);
      pairs.push({ from, to: [x + sigma * noise(), y + sigma * noise()] });
    }
    const fit = fitAffine(pairs)!;
    close(fit.transform, known, 0.2);
    expect(fit.rms).toBeGreaterThan(sigma);
    expect(fit.rms).toBeLessThan(sigma * 2);
    expect(fit.residuals).toHaveLength(200);
  });

  it('flags an outlier through its residual', () => {
    const pairs = grid.map((from) => ({ from, to: applyAffine(known, from) }));
    pairs[4] = { from: pairs[4]!.from, to: [pairs[4]!.to[0] + 20, pairs[4]!.to[1]] };
    const fit = fitAffine(pairs)!;
    const worst = fit.residuals.indexOf(Math.max(...fit.residuals));
    expect(worst).toBe(4);
  });

  it('refuses too few or collinear points', () => {
    expect(fitAffine(grid.slice(0, 2).map((from) => ({ from, to: from })))).toBeUndefined();
    const line = [0, 1, 2, 3].map((i): ControlPair => ({ from: [i, 2 * i], to: [i, i] }));
    expect(fitAffine(line)).toBeUndefined();
  });

  it('inverts and composes', () => {
    const inv = invertAffine(known)!;
    close(composeAffine(inv, known), IDENTITY, 1e-12);
    close(applyAffine(inv, applyAffine(known, [3, 4])), [3, 4], 1e-9);
    expect(invertAffine([1, 2, 0, 2, 4, 0])).toBeUndefined();
  });
});

describe('similarity fit (Umeyama)', () => {
  const sim = (s: number, r: number, tx: number, ty: number): Affine => [
    s * Math.cos(r),
    -s * Math.sin(r),
    tx,
    s * Math.sin(r),
    s * Math.cos(r),
    ty,
  ];
  const pts: XY[] = [
    [0, 0],
    [10, 0],
    [10, 20],
    [-5, 7],
    [3, -9],
  ];

  it('recovers scale, rotation and translation exactly', () => {
    const t = sim(1.02, 0.4, 5, -3);
    const fit = fitSimilarity(pts.map((from) => ({ from, to: applyAffine(t, from) })))!;
    expect(fit.scale).toBeCloseTo(1.02, 10);
    expect(fit.rotation).toBeCloseTo(0.4, 10);
    close(fit.translation, [5, -3], 1e-9);
    expect(fit.rms).toBeLessThan(1e-9);
  });

  it('works from two points', () => {
    const t = sim(2, -1, 0, 1);
    const fit = fitSimilarity(pts.slice(0, 2).map((from) => ({ from, to: applyAffine(t, from) })))!;
    close(fit.transform, t, 1e-9);
  });

  it('fits a rigid transform when scale is fixed', () => {
    const t = sim(1.5, 0.2, 1, 1);
    const fit = fitSimilarity(
      pts.map((from) => ({ from, to: applyAffine(t, from) })),
      { scale: false },
    )!;
    expect(fit.scale).toBe(1);
    expect(fit.rotation).toBeCloseTo(0.2, 10);
    expect(fit.rms).toBeGreaterThan(0);
  });

  it('never reflects', () => {
    const fit = fitSimilarity(pts.map((from): ControlPair => ({ from, to: [from[0], -from[1]] })))!;
    const [a, b, , d, e] = fit.transform;
    expect(a * e - b * d).toBeGreaterThanOrEqual(0);
  });

  it('is robust to GPS-like noise (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -Math.PI, max: Math.PI, noNaN: true }),
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.double({ min: -50, max: 50, noNaN: true }),
        fc.integer(),
        (r, tx, ty, seed) => {
          const noise = rng(seed);
          const t = sim(1, r, tx, ty);
          const pairs: ControlPair[] = [];
          for (let i = 0; i < 30; i++) {
            const from: XY = [(i % 6) * 10, Math.floor(i / 6) * 10];
            const [x, y] = applyAffine(t, from);
            pairs.push({ from, to: [x + 0.3 * noise(), y + 0.3 * noise()] });
          }
          const fit = fitSimilarity(pairs)!;
          expect(Math.abs(fit.scale - 1)).toBeLessThan(0.03);
          expect(Math.abs(normalizeDeg(((fit.rotation - r) * 180) / Math.PI))).toBeLessThan(1);
          expect(fit.rms).toBeLessThan(1);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('refuses coincident points', () => {
    expect(
      fitSimilarity([
        { from: [1, 1], to: [0, 0] },
        { from: [1, 1], to: [2, 2] },
      ]),
    ).toBeUndefined();
  });
});

describe('rows horizontal', () => {
  const o: [number, number] = [-72.68, 43.47];
  const toward = (b: number): [number, number][] => {
    const p = localProjection(o);
    const r = (b * Math.PI) / 180;
    return [o, p.toLngLat([10 * Math.sin(r), 10 * Math.cos(r)])];
  };

  it('turns an east-running row to bearing 0 (already horizontal)', () => {
    expect(rowsHorizontalBearing(toward(90))).toBeCloseTo(0, 6);
  });

  it('turns a north-running row to ±90, whichever is the smaller turn', () => {
    expect(rowsHorizontalBearing(toward(0), 0)).toBeCloseTo(-90, 6);
    expect(rowsHorizontalBearing(toward(0), 80)).toBeCloseTo(90, 6);
  });

  it('averages row axes, ignoring direction', () => {
    expect(meanAxisBearing([toward(30), toward(210), toward(30)])).toBeCloseTo(30, 6);
    expect(meanAxisBearing([])).toBeUndefined();
  });
});

describe('bbox and point in polygon', () => {
  const square = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      [
        [4, 4],
        [6, 4],
        [6, 6],
        [4, 6],
        [4, 4],
      ],
    ],
  };

  it('boxes mixed geometry', () => {
    expect(
      bboxOf([
        square,
        undefined,
        {
          type: 'LineString',
          coordinates: [
            [-1, 2],
            [3, 12],
          ],
        },
      ]),
    ).toEqual([-1, 0, 10, 12]);
    expect(bboxOf([])).toBeUndefined();
  });

  it('respects holes', () => {
    expect(pointInPolygon([1, 1], square)).toBe(true);
    expect(pointInPolygon([5, 5], square)).toBe(false);
    expect(pointInPolygon([11, 5], square)).toBe(false);
    expect(
      pointInPolygon([21, 1], {
        type: 'MultiPolygon',
        coordinates: [
          square.coordinates,
          [
            [
              [20, 0],
              [22, 0],
              [22, 2],
              [20, 0],
            ],
          ],
        ],
      }),
    ).toBe(true);
  });
});
