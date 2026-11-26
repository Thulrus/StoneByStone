// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { distanceM, type SourcePoint } from '../geo';
import { listRows } from './layout';
import { gridRowsToRows, legacyGridOf, pinLegacyGrid } from './legacy-grid';
import { freshStore } from './test/helpers';
import { importV1 } from './v1/import';

async function willowCreek() {
  const { store } = await freshStore();
  const json: unknown = JSON.parse(
    await readFile('tests/fixtures/v1/willow-creek-example.cem.json', 'utf8'),
  );
  const { cemeteryId } = await importV1(store, json);
  const grid = await legacyGridOf(store, cemeteryId);
  if (!grid) throw new Error('no grid');
  return { store, cemeteryId, grid };
}

// Cells 2 m apart, grid columns running east, rows running south.
const at = (col: number, row: number): SourcePoint => ({
  x: col + 0.5,
  y: row + 0.5,
  lng: -72.6 + (col * 2) / 80_700,
  lat: 43.5 - (row * 2) / 111_100,
});

test('the Willow Creek grid can be pinned onto the map', async () => {
  const { store, cemeteryId, grid } = await willowCreek();
  const r = await pinLegacyGrid(store, grid, [at(0, 0), at(24, 0), at(0, 19)]);
  expect(r.stones).toBe(37);
  expect(r.rmsM).toBeLessThan(0.01);
  const stones = await store.monuments.listByCemetery(cemeteryId);
  for (const m of stones) {
    expect(m.position?.source).toBe('legacy-grid');
    const want = at(m.legacyGrid!.col, m.legacyGrid!.row);
    expect(distanceM([m.position!.lng, m.position!.lat], [want.lng, want.lat])).toBeLessThan(0.05);
    expect(m.position!.accuracyM).toBeCloseTo(2, 0);
  }
  const features = await store.features.listByCemetery(cemeteryId);
  expect(features.length).toBeGreaterThan(0);
  for (const f of features) expect(f.geometry?.type).toMatch(/Polygon$/);
  expect((await legacyGridOf(store, cemeteryId))?.transform).toHaveLength(6);
  expect((await store.cemeteries.get(cemeteryId))?.location?.lat).toBeCloseTo(43.5, 3);

  // One undo puts everything back.
  await store.undo();
  expect((await store.monuments.listByCemetery(cemeteryId)).every((m) => !m.position)).toBe(true);
});

test('grid rows become cemetery rows, in column order, with lines once pinned', async () => {
  const { store, cemeteryId, grid } = await willowCreek();
  await pinLegacyGrid(store, grid, [at(0, 0), at(10, 0)]);
  const rows = await gridRowsToRows(store, cemeteryId);
  expect(rows.length).toBeGreaterThan(1);
  expect((await listRows(store, cemeteryId)).length).toBe(rows.length);
  const stones = await store.monuments.listByCemetery(cemeteryId);
  expect(stones.every((m) => m.address?.rowId)).toBe(true);
  for (const row of rows) {
    const mine = stones.filter((m) => m.address?.rowId === row.id);
    expect(Math.min(...mine.map((m) => m.address!.rowIndex!))).toBe(0);
    expect(mine.every((m) => String(m.legacyGrid!.row + 1) === row.label)).toBe(true);
    if (mine.length > 1) expect(row.line?.coordinates).toHaveLength(2);
  }
  // Running it again finds nothing left to do.
  expect(await gridRowsToRows(store, cemeteryId)).toEqual([]);
});
