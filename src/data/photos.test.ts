// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { defaultCemeterySettings } from '../domain';
import { rowBlob } from './blobs';
import { addPhoto } from './photos';
import { freshStore } from './test/helpers';

const jpeg = (n: number) => new Blob([new Uint8Array(n).fill(7)], { type: 'image/jpeg' });

async function setup() {
  const { store } = await freshStore();
  const c = await store.cemeteries.create({
    name: 'Hill',
    contributors: [store.device.contributorId],
    settings: defaultCemeterySettings(),
  });
  const m = await store.monuments.create({ cemeteryId: c.id, kind: 'headstone' });
  return { store, c, m };
}

describe('addPhoto', () => {
  test('stores record, bytes and thumbnail; marks the stone photographed; undoes as one', async () => {
    const { store, c, m } = await setup();
    const p = await addPhoto(store, {
      monumentId: m.id,
      role: 'front',
      full: jpeg(1000),
      thumb: jpeg(50),
      width: 1600,
      height: 1200,
      sha256: 'a'.repeat(64),
      phash: '0123456789abcdef',
    });
    expect(p).toMatchObject({ cemeteryId: c.id, bytes: 1000, role: 'front' });
    const row = await store.db.photoBlobs.get(p.id);
    expect(row?.bytes?.byteLength).toBe(1000);
    expect(row?.blob).toBeUndefined();
    expect(rowBlob(row)?.type).toBe('image/jpeg');
    expect((await store.photos.thumb(p.id))?.size).toBe(50);
    expect((await store.monuments.get(m.id))?.status).toBe('photographed');

    await store.undo();
    expect(await store.photos.get(p.id)).toBeUndefined();
    expect(await store.db.photoBlobs.get(p.id)).toBeUndefined();
    expect(await store.db.photoThumbs.get(p.id)).toBeUndefined();
    expect((await store.monuments.get(m.id))?.status).toBe('located');
  });

  test('still reads rows stored as Blobs by earlier builds', async () => {
    const { store } = await setup();
    await store.db.photoBlobs.put({ id: 'old', blob: jpeg(12) });
    expect((await store.photos.blob('old'))?.size).toBe(12);
  });
});
