// @vitest-environment node
import { expect, test } from 'vitest';
import { freshStore } from './test/helpers';
import { downloadId, listTileDownloads, putTileDownload, removeTileDownload } from './tiles';

test('removing a download frees only tiles no other cemetery uses', async () => {
  const { store } = await freshStore();
  const base = { providerId: 'p', bytes: 0, downloadedAt: '2026-11-25T00:00:00Z' };
  await putTileDownload(store, {
    ...base,
    id: downloadId('a', 'p'),
    cemeteryId: 'a',
    tiles: ['1/0/0', '1/0/1'],
  });
  await putTileDownload(store, {
    ...base,
    id: downloadId('b', 'p'),
    cemeteryId: 'b',
    tiles: ['1/0/1'],
  });
  expect(await removeTileDownload(store, downloadId('a', 'p'))).toEqual(['1/0/0']);
  expect((await listTileDownloads(store)).map((d) => d.cemeteryId)).toEqual(['b']);
  expect(await removeTileDownload(store, 'missing')).toEqual([]);
});
