// @vitest-environment node
import { expect, test } from 'vitest';
import { defaultCemeterySettings } from '../domain';
import { cemeteryPhotoHashes, importPhotoStones } from './photo-import';
import { preparePhoto } from './photos';
import { freshStore } from './test/helpers';

const M = 1 / 110_574;

async function setup() {
  const { store } = await freshStore();
  const c = await store.cemeteries.create({
    name: 'Hill',
    contributors: [store.device.contributorId],
    settings: defaultCemeterySettings(),
  });
  let n = 0;
  const photo = (north?: number) =>
    preparePhoto(store, {
      monumentId: '',
      role: 'front',
      full: new Blob([new Uint8Array(10)], { type: 'image/jpeg' }),
      thumb: new Blob([new Uint8Array(2)], { type: 'image/jpeg' }),
      width: 10,
      height: 10,
      sha256: String(++n).padStart(64, '0'),
      takenAt: new Date(Date.UTC(2026, 4, 1, 10, 0, n)).toISOString(),
      ...(north !== undefined
        ? { position: { lng: -72, lat: 44 + north * M, accuracyM: 5, source: 'gps' as const } }
        : {}),
    });
  return { store, c, photo };
}

test('no row: stones at their first GPS photo, front then other, one undo step', async () => {
  const { store, c, photo } = await setup();
  const stones = [[await photo(0), await photo(1)], [await photo(10)], [await photo()]];
  const made = await importPhotoStones(store, c.id, stones, { label: 'Import photos' });
  expect(made).toHaveLength(3);
  const saved = await Promise.all(made.map((m) => store.monuments.get(m.id)));
  expect(saved.map((m) => m?.status)).toEqual(['photographed', 'photographed', 'photographed']);
  expect(saved[0]?.position).toMatchObject({ lat: 44, source: 'gps', accuracyM: 5 });
  expect(saved[1]?.position?.lat).toBeCloseTo(44 + 10 * M, 9);
  expect(saved[2]?.position).toBeUndefined();
  const first = await store.photos.byMonument(made[0]?.id ?? '');
  expect(first.map((p) => p.role)).toEqual(['front', 'other']);
  expect((await cemeteryPhotoHashes(store, c.id)).size).toBe(4);

  await store.undo();
  expect(await store.monuments.listByCemetery(c.id)).toHaveLength(0);
  expect(await store.photos.listByCemetery(c.id)).toHaveLength(0);
});

test('a row: stones go after its last stone in order and are laid out along it', async () => {
  const { store, c, photo } = await setup();
  const row = await store.rows.create({
    cemeteryId: c.id,
    label: '1',
    line: {
      type: 'LineString',
      coordinates: [
        [-72, 44],
        [-72, 44 + 20 * M],
      ],
    },
  });
  await store.monuments.create({
    cemeteryId: c.id,
    kind: 'headstone',
    address: { rowId: row.id, rowIndex: 0 },
  });
  const made = await importPhotoStones(store, c.id, [[await photo(4)], [await photo(8)]], {
    label: 'Import photos',
    rowId: row.id,
  });
  const saved = await Promise.all(made.map((m) => store.monuments.get(m.id)));
  expect(saved.map((m) => m?.address?.rowIndex)).toEqual([1, 2]);
  expect(saved.every((m) => m?.position?.source === 'row-interpolated')).toBe(true);
  const [a, b] = saved.map((m) => m?.position?.lat ?? 0);
  expect(b).toBeGreaterThan(a ?? 0);
});
