// @vitest-environment node
import { expect, test } from 'vitest';
import { makeStonesDocument } from '../../../tests/fixtures/stones';
import { freshStore } from '../test/helpers';
import { importArchive } from './import';
import { readSbsJson } from './parse';

test('the synthetic stones fixture is a valid .sbs.json that imports', async () => {
  const doc = makeStonesDocument({ rows: 4, perRow: 5 });
  const archive = readSbsJson(JSON.stringify(doc));
  const { store } = await freshStore();
  await importArchive(store, archive);
  const stones = await store.monuments.listByCemetery(doc.cemetery.id);
  expect(stones).toHaveLength(20);
  // Status is re-derived on import; "photographed" needs photo records, which this has none of.
  expect(new Set(stones.map((s) => s.status))).toEqual(
    new Set(['located', 'transcribed', 'verified']),
  );
});
