// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { defaultCemeterySettings } from '../domain';
import { localProjection } from '../geo';
import { moveStone, reverseRow } from './row-controls';
import { freshStore } from './test/helpers';
import { captureStone, endRowHere, rowStones } from './walk';

const proj = localProjection([-72.58, 44.26]);
const east = (x: number) => proj.toLngLat([x, 0]);

async function setup() {
  const { store } = await freshStore();
  const c = await store.cemeteries.create({
    name: 'Hill',
    contributors: [store.device.contributorId],
    settings: defaultCemeterySettings(),
  });
  const row = await store.rows.create({
    cemeteryId: c.id,
    label: '4',
    line: { type: 'LineString', coordinates: [east(0), east(20)] },
  });
  const add = (opts: Partial<Parameters<typeof captureStone>[1]> = {}) =>
    captureStone(store, { rowId: row.id, ...opts });
  /** Stone ids by rowIndex; `null` for a gap. */
  const order = async () => {
    const stones = await rowStones(store, row);
    const k = Math.max(-1, ...stones.map((m) => m.address?.rowIndex ?? -1)) + 1;
    return Array.from(
      { length: k },
      (_, i) => stones.find((m) => m.address?.rowIndex === i)?.id ?? null,
    );
  };
  const xOf = async (id: string) => {
    const p = (await store.monuments.get(id))?.position;
    return p ? Math.round(proj.toLocal([p.lng, p.lat])[0] * 100) / 100 : undefined;
  };
  return { store, row, add, order, xOf };
}

describe('row controls', () => {
  test('gap leaves an empty slot before the next stone', async () => {
    const { add, order } = await setup();
    const a = await add();
    const b = await add({ gaps: 2 });
    expect(await order()).toEqual([a.id, null, null, b.id]);
  });

  test('skip makes a photo-less stone flagged for a revisit', async () => {
    const { add } = await setup();
    const m = await add({ flags: ['needs-revisit'] });
    expect(m.flags).toEqual(['needs-revisit']);
    expect(m.status).toBe('located');
  });

  test('insert shifts later stones, fills a gap without shifting, and undoes in one step', async () => {
    const { store, add, order } = await setup();
    const a = await add();
    const b = await add();
    const c = await add({ gaps: 1 });
    const x = await add({ at: 1 });
    expect(await order()).toEqual([a.id, x.id, b.id, null, c.id]);
    const y = await add({ at: 3 });
    expect(await order()).toEqual([a.id, x.id, b.id, y.id, c.id]);
    await store.undo();
    await store.undo();
    expect(await order()).toEqual([a.id, b.id, null, c.id]);
  });

  test('a reversed walk puts new stones (and gaps) before stone 1', async () => {
    const { add, order } = await setup();
    const a = await add();
    const b = await add({ at: 0, gaps: 1 });
    expect(await order()).toEqual([b.id, null, a.id]);
  });

  test('reverse renumbers from the other end without moving anything, and undoes', async () => {
    const { store, row, add, order, xOf } = await setup();
    const a = await add();
    const b = await add({ gaps: 1 });
    const c = await add();
    const before = await Promise.all([a, b, c].map((m) => xOf(m.id)));
    expect(await reverseRow(store, row.id)).toBe(true);
    expect(await order()).toEqual([c.id, b.id, null, a.id]);
    expect(await Promise.all([a, b, c].map((m) => xOf(m.id)))).toEqual(before);
    expect((await store.rows.get(row.id))?.line?.coordinates[0]).toEqual(east(20));
    await store.undo();
    expect(await order()).toEqual([a.id, null, b.id, c.id]);
    expect((await store.rows.get(row.id))?.line?.coordinates[0]).toEqual(east(0));
  });

  test('row end on a reversed walk moves the line start', async () => {
    const { store, row } = await setup();
    const [lng, lat] = east(-5);
    await endRowHere(store, row.id, { lng, lat }, { atStart: true });
    expect((await store.rows.get(row.id))?.line?.coordinates).toEqual([east(-5), east(20)]);
  });

  test('move swaps with a neighbour or slides into a gap, within bounds', async () => {
    const { store, add, order } = await setup();
    const a = await add();
    const b = await add();
    const c = await add({ gaps: 1 });
    expect(await moveStone(store, a.id, -1)).toBe(false);
    expect(await moveStone(store, a.id, 1)).toBe(true);
    expect(await order()).toEqual([b.id, a.id, null, c.id]);
    expect(await moveStone(store, a.id, 1)).toBe(true);
    expect(await order()).toEqual([b.id, null, a.id, c.id]);
    expect(await moveStone(store, c.id, 1)).toBe(false);
    await store.undo();
    expect(await order()).toEqual([b.id, a.id, null, c.id]);
  });
});

test('placing a stone by averaged GPS anchors its row', async () => {
  const { placeStone } = await import('./placement');
  const { store, add, xOf } = await setup();
  const a = await add();
  const b = await add();
  const c = await add();
  expect(await xOf(b.id)).toBe(10);
  const [lng, lat] = east(14);
  await placeStone(store, b.id, { lng, lat, accuracyM: 3, source: 'gps-averaged' });
  expect(await xOf(b.id)).toBe(14);
  expect(await xOf(a.id)).toBe(0);
  expect(await xOf(c.id)).toBe(20);
  await store.undo();
  expect(await xOf(b.id)).toBe(10);
});
