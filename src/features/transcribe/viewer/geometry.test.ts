import { describe, expect, test } from 'vitest';
import {
  apply,
  fitView,
  keystone,
  squareToQuad,
  toSource,
  zoomAt,
  panBy,
  type Vec2,
} from './geometry';

const close = (a: Vec2, b: Vec2) => {
  expect(a[0]).toBeCloseTo(b[0], 9);
  expect(a[1]).toBeCloseTo(b[1], 9);
};

describe('geometry', () => {
  test('squareToQuad maps the corners', () => {
    const q: [Vec2, Vec2, Vec2, Vec2] = [
      [0.1, 0.2],
      [0.9, 0],
      [1, 1],
      [0, 0.8],
    ];
    const m = squareToQuad(q);
    close(apply(m, [0, 0]), q[0]);
    close(apply(m, [1, 0]), q[1]);
    close(apply(m, [1, 1]), q[2]);
    close(apply(m, [0, 1]), q[3]);
  });

  test('no keystone is the identity; vertical widens the top', () => {
    close(apply(keystone(0, 0), [0.3, 0.7]), [0.3, 0.7]);
    const m = keystone(0.4, 0);
    close(apply(m, [0, 0]), [0.2, 0]); // output's top-left samples further in
    close(apply(m, [0, 1]), [0, 1]); // bottom untouched
  });

  const canvas = { w: 800, h: 600 };
  const img = { w: 1600, h: 1200 };

  test('fit: canvas corners are photo corners', () => {
    const m = toSource(fitView(img), canvas, img);
    close(apply(m, [0, 0]), [0, 0]);
    close(apply(m, [800, 600]), [1, 1]);
    close(apply(m, [400, 300]), [0.5, 0.5]);
  });

  test('zoom keeps the point under the cursor; pan moves with the drag', () => {
    const v0 = fitView(img);
    const p: Vec2 = [200, 150];
    const before = apply(toSource(v0, canvas, img), p);
    const v1 = zoomAt(v0, p, 4, canvas, img);
    expect(v1.zoom).toBe(4);
    close(apply(toSource(v1, canvas, img), p), before);
    const v2 = panBy(v1, 100, 0, canvas, img);
    close(apply(toSource(v2, canvas, img), [300, 150]), before);
  });

  test('straighten turns about the photo centre', () => {
    const m = toSource(fitView(img), canvas, img, { rotateDeg: 90 });
    close(apply(m, [400, 300]), [0.5, 0.5]);
    // Canvas right of centre shows what was above centre (turned 90° clockwise).
    const [u, v] = apply(m, [500, 300]);
    expect(u).toBeCloseTo(0.5, 9);
    expect(v).toBeLessThan(0.5);
  });
});
