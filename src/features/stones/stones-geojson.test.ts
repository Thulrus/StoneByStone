import { expect, test } from 'vitest';
import type { Monument } from '../../domain';
import { stonesGeoJson } from './stones-geojson';

const stone = (i: number, placed = true) =>
  ({
    id: `m${i}`,
    status: 'located',
    ...(placed ? { position: { lng: i * 1e-5, lat: 0, source: 'map' } } : {}),
  }) as Monument;

test('only placed stones become points, carrying id and status', () => {
  const fc = stonesGeoJson([stone(1), stone(2, false)]);
  expect(fc.features).toHaveLength(1);
  expect(fc.features[0]?.properties).toEqual({ id: 'm1', status: 'located' });
  expect(fc.features[0]?.geometry.coordinates).toEqual([1e-5, 0]);
});

test('10,000 stones build in well under a frame budget', () => {
  const many = Array.from({ length: 10_000 }, (_, i) => stone(i));
  const t0 = performance.now();
  expect(stonesGeoJson(many).features).toHaveLength(10_000);
  expect(performance.now() - t0).toBeLessThan(100);
});
