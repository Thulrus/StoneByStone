import { describe, expect, test } from 'vitest';
import {
  bufferBBox,
  countTilesInBBox,
  distanceM,
  fillTileTemplate,
  quadkey,
  tileAt,
  tileBBox3857,
  tilesInBBox,
} from '.';

describe('tiles', () => {
  test('tileAt matches the slippy-map formula', () => {
    expect(tileAt(0, 0, 1)).toEqual({ z: 1, x: 1, y: 1 });
    expect(tileAt(-180, 85, 2)).toEqual({ z: 2, x: 0, y: 0 });
    // Known: Berlin at z10.
    expect(tileAt(13.4, 52.52, 10)).toEqual({ z: 10, x: 550, y: 335 });
  });

  test('quadkey', () => {
    expect(quadkey({ z: 3, x: 3, y: 5 })).toBe('213');
    expect(quadkey({ z: 0, x: 0, y: 0 })).toBe('');
  });

  test('tile bounds in EPSG:3857', () => {
    const [minX, minY, maxX, maxY] = tileBBox3857({ z: 1, x: 0, y: 0 });
    expect(minX).toBeCloseTo(-20037508.34, 1);
    expect(maxY).toBeCloseTo(20037508.34, 1);
    expect(maxX).toBeCloseTo(0, 6);
    expect(minY).toBeCloseTo(0, 6);
  });

  test('template filling', () => {
    expect(fillTileTemplate('https://t/{z}/{y}/{x}.jpg', { z: 3, x: 3, y: 5 })).toBe(
      'https://t/3/5/3.jpg',
    );
    expect(fillTileTemplate('q={quadkey}', { z: 3, x: 3, y: 5 })).toBe('q=213');
    expect(fillTileTemplate('b={bbox-epsg-3857}', { z: 0, x: 0, y: 0 })).toMatch(/^b=-2003/);
  });

  test('a small cemetery is a few hundred tiles at z15–20', () => {
    const bbox = bufferBBox([-72.601, 43.5, -72.599, 43.501], 30);
    const tiles = tilesInBBox(bbox, 15, 20);
    expect(tiles.length).toBe(countTilesInBBox(bbox, 15, 20));
    expect(tiles.length).toBeGreaterThan(20);
    expect(tiles.length).toBeLessThan(400);
    expect(new Set(tiles.map((t) => `${t.z}/${t.x}/${t.y}`)).size).toBe(tiles.length);
  });

  test('bufferBBox grows each side by the distance', () => {
    const b = bufferBBox([10, 50, 10.001, 50.001], 100);
    expect(distanceM([b[0], 50], [10, 50])).toBeCloseTo(100, 0);
    expect(distanceM([10, b[3]], [10, 50.001])).toBeCloseTo(100, 0);
  });
});
