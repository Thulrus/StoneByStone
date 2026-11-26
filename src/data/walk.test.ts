// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { defaultCemeterySettings } from '../domain';
import { distanceM, localProjection, projectOntoLine } from '../geo';
import { preparePhoto } from './photos';
import { freshStore } from './test/helpers';
import { captureStone, endRowHere, relayoutRow, rowStones, setRowStart } from './walk';

const proj = localProjection([-72.58, 44.26]);
const east = (x: number, y = 0) => {
  const [lng, lat] = proj.toLngLat([x, y]);
  return { lng, lat };
};

async function setup(withLine = true) {
  const { store } = await freshStore();
  const c = await store.cemeteries.create({
    name: 'Hill',
    contributors: [store.device.contributorId],
    settings: defaultCemeterySettings(),
  });
  const a = east(0);
  const b = east(20);
  const row = await store.rows.create({
    cemeteryId: c.id,
    label: '4',
    ...(withLine
      ? {
          line: {
            type: 'LineString' as const,
            coordinates: [
              [a.lng, a.lat],
              [b.lng, b.lat],
            ],
          },
        }
      : {}),
  });
  return { store, c, row };
}

const photoAt = async (
  store: Awaited<ReturnType<typeof setup>>['store'],
  fix?: ReturnType<typeof east> & { accuracyM?: number },
) =>
  preparePhoto(store, {
    monumentId: '',
    role: 'front',
    full: new Blob([new Uint8Array(10)], { type: 'image/jpeg' }),
    thumb: new Blob([new Uint8Array(2)], { type: 'image/jpeg' }),
    width: 10,
    height: 10,
    sha256: '0'.repeat(64),
    ...(fix ? { position: { ...fix, source: 'gps' as const } } : {}),
  });

const alongs = async (
  store: Awaited<ReturnType<typeof setup>>['store'],
  row: { id: string; cemeteryId: string },
  line: [number, number][],
) =>
  (await rowStones(store, row))
    .sort((x, y) => (x.address?.rowIndex ?? 0) - (y.address?.rowIndex ?? 0))
    .map((m) => projectOntoLine(line, [m.position!.lng, m.position!.lat]).along);

const LINE: [number, number][] = [
  [east(0).lng, east(0).lat],
  [east(20).lng, east(20).lat],
];

describe('walk-a-row', () => {
  test('with no GPS, stones get consecutive indices and are spaced along the drawn line', async () => {
    const { store, row } = await setup();
    for (let i = 0; i < 5; i++)
      await captureStone(store, { rowId: row.id, photo: await photoAt(store) });
    const stones = await rowStones(store, row);
    expect(stones.map((m) => m.address?.rowIndex).sort()).toEqual([0, 1, 2, 3, 4]);
    expect(stones.every((m) => m.status === 'photographed')).toBe(true);
    const a = await alongs(store, row, LINE);
    a.forEach((d, i) => expect(d).toBeCloseTo(i * 5, 3));
    expect(stones.every((m) => m.position?.source === 'row-interpolated')).toBe(true);
  });

  test('noisy GPS keeps the walking order', async () => {
    const { store, row } = await setup();
    const noise = [4, -3, 5, -4, 3, -5, 2, -2];
    for (let i = 0; i < 8; i++) {
      const fix = { ...east(i * 2.5 + noise[i]!, noise[(i + 3) % 8]!), accuracyM: 6 };
      await captureStone(store, { rowId: row.id, photo: await photoAt(store, fix) });
    }
    const a = await alongs(store, row, LINE);
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeGreaterThan(a[i - 1]!);
  });

  test('undo removes the stone and puts the others back', async () => {
    const { store, row } = await setup();
    await captureStone(store, { rowId: row.id });
    await captureStone(store, { rowId: row.id });
    const before = await alongs(store, row, LINE);
    await captureStone(store, { rowId: row.id });
    await store.undo();
    expect((await rowStones(store, row)).length).toBe(2);
    expect(await alongs(store, row, LINE)).toEqual(before);
  });

  test('hand-placed stones are kept', async () => {
    const { store, row } = await setup();
    const m = await captureStone(store, { rowId: row.id });
    await captureStone(store, { rowId: row.id });
    const here = east(3, 1);
    await store.monuments.update(m.id, { position: { ...here, source: 'map' } });
    await relayoutRow(store, row.id);
    expect((await store.monuments.get(m.id))?.position).toEqual({ ...here, source: 'map' });
  });

  test('GPS start with no line: name-only until row end, then re-spaced along start → end', async () => {
    const { store, row } = await setup(false);
    await captureStone(store, { rowId: row.id });
    expect((await rowStones(store, row))[0]?.position).toBeUndefined();
    await setRowStart(store, row.id, east(0));
    for (let i = 0; i < 3; i++) await captureStone(store, { rowId: row.id });
    expect(await endRowHere(store, row.id, east(12))).toBe(true);
    expect((await store.rows.get(row.id))?.line?.coordinates).toHaveLength(2);
    const a = await alongs(store, row, [LINE[0]!, [east(12).lng, east(12).lat]]);
    a.forEach((d, i) => expect(d).toBeCloseTo(i * 4, 3));
  });

  test('GPS start plus fixes gives positions before the row end', async () => {
    const { store, row } = await setup(false);
    await setRowStart(store, row.id, east(0));
    await captureStone(store, {
      rowId: row.id,
      photo: await photoAt(store, { ...east(1), accuracyM: 3 }),
    });
    await captureStone(store, {
      rowId: row.id,
      photo: await photoAt(store, { ...east(4), accuracyM: 3 }),
    });
    const [s0, s1] = (await rowStones(store, row)).sort(
      (x, y) => (x.address?.rowIndex ?? 0) - (y.address?.rowIndex ?? 0),
    );
    expect(
      distanceM([s0!.position!.lng, s0!.position!.lat], [east(1).lng, east(1).lat]),
    ).toBeLessThan(0.01);
    expect(
      distanceM([s1!.position!.lng, s1!.position!.lat], [east(4).lng, east(4).lat]),
    ).toBeLessThan(0.01);
  });
});
