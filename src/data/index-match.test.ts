import { expect, test } from 'vitest';
import { defaultCemeterySettings, parseName, type Person } from '../domain';
import {
  attachToStone,
  matchedItems,
  mergeIntoPerson,
  setNoStoneFound,
  unlink,
} from './index-match';
import { dataFields } from './repository';
import { freshStore } from './test/helpers';
import { captureStone } from './walk';

async function setup() {
  const { store } = await freshStore();
  const c = await store.cemeteries.create({
    name: 'Hill',
    contributors: [store.device.contributorId],
    settings: defaultCemeterySettings(),
  });
  const row = await store.rows.create({ cemeteryId: c.id, label: '1' });
  const bare = await captureStone(store, { rowId: row.id });
  const carved = await captureStone(store, { rowId: row.id });
  const john = await store.persons.create({
    cemeteryId: c.id,
    monumentId: carved.id,
    name: parseName('JOHN SMITH'),
    death: { original: '1890', y: 1890 },
  });
  const index = (surname: string, extra: Partial<Person> = {}) =>
    store.persons.create({
      cemeteryId: c.id,
      name: { given: 'John', surname },
      matchStatus: 'unmatched',
      sources: [{ kind: 'imported-index', ref: `x.csv, ${surname}`, location: { row: '1' } }],
      ...extra,
    });
  const all = () => store.persons.listByCemetery(c.id, { includeDeleted: true });
  const live = () => store.persons.listByCemetery(c.id);
  return { store, bare, carved, john, index, all, live };
}

test('attach: the record becomes the stone’s person; unlink and undo both reverse it', async () => {
  const { store, bare, index, all } = await setup();
  const r = await index('Peck');
  await attachToStone(store, r.id, bare.id);
  expect(await store.persons.get(r.id)).toMatchObject({
    monumentId: bare.id,
    matchStatus: 'matched',
  });
  expect((await store.monuments.get(bare.id))?.status).toBe('transcribed');
  const [item] = matchedItems(await all());
  expect(item).toMatchObject({ kind: 'attached', record: { id: r.id } });

  await store.undo();
  expect(await store.persons.get(r.id)).toMatchObject({ matchStatus: 'unmatched' });
  expect((await store.persons.get(r.id))?.monumentId).toBeUndefined();
  expect((await store.monuments.get(bare.id))?.status).toBe('located');

  await attachToStone(store, r.id, bare.id);
  const [again] = matchedItems(await all());
  if (!again) throw new Error('not matched');
  await unlink(store, again);
  expect((await store.persons.get(r.id))?.monumentId).toBeUndefined();
  expect(matchedItems(await all())).toEqual([]);
  await store.undo(); // undo the unlink
  expect((await store.persons.get(r.id))?.monumentId).toBe(bare.id);
});

test('merge: the carved person keeps its name and gains the source and blank fields', async () => {
  const { store, john, index, all, live } = await setup();
  const r = await index('Smith', {
    death: { original: '1891', y: 1891 },
    birth: { original: '1820', y: 1820 },
    military: { conflict: 'Civil War' },
  });
  await mergeIntoPerson(store, r.id, john.id);
  const merged = await store.persons.get(john.id);
  expect(merged?.name.asCarved).toBe('JOHN SMITH');
  expect(merged?.death?.y).toBe(1890); // the stone's date is kept
  expect(merged?.birth?.y).toBe(1820);
  expect(merged?.military).toEqual({ conflict: 'Civil War' });
  expect(merged?.aliases).toEqual([r.id]);
  expect(merged?.matchStatus).toBe('matched');
  expect((await live()).map((p) => p.id)).toEqual([john.id]);
  const [item] = matchedItems(await all());
  expect(item).toMatchObject({ kind: 'merged', person: { id: john.id }, record: { id: r.id } });

  // Undo restores both people (with new stamps, so other devices see the undo).
  await store.undo();
  const restored = await store.persons.get(john.id);
  expect(restored && dataFields(restored)).toEqual(dataFields(john));
  expect((await store.persons.get(r.id))?.deleted).toBeUndefined();
});

test('unlinking a merge splits the record back out and clears only what it filled', async () => {
  const { store, john, index, all, live } = await setup();
  const r = await index('Smith', { birth: { original: '1820', y: 1820 } });
  await mergeIntoPerson(store, r.id, john.id);
  await store.persons.update(john.id, { occupation: 'Blacksmith' });
  const [item] = matchedItems(await all());
  if (!item) throw new Error('not matched');
  await unlink(store, item);

  const back = await store.persons.get(john.id);
  expect(back?.birth).toBeUndefined();
  expect(back?.occupation).toBe('Blacksmith');
  expect(back?.aliases).toBeUndefined();
  expect(back?.sources).toBeUndefined();
  expect(back?.matchStatus).toBeUndefined();
  const split = (await live()).find((p) => p.id !== john.id);
  expect(split).toMatchObject({
    name: { given: 'John', surname: 'Smith' },
    birth: { y: 1820 },
    matchStatus: 'unmatched',
    sources: r.sources,
  });
  expect(split?.monumentId).toBeUndefined();
  expect(matchedItems(await all())).toEqual([]);

  await store.undo();
  expect(matchedItems(await all())).toHaveLength(1);
  expect(await live()).toHaveLength(1);
});

test('no stone found is a flag that can be cleared', async () => {
  const { store, index } = await setup();
  const r = await index('Lost');
  await setNoStoneFound(store, r.id, true);
  expect((await store.persons.get(r.id))?.matchStatus).toBe('no-stone-found');
  await setNoStoneFound(store, r.id, false);
  expect((await store.persons.get(r.id))?.matchStatus).toBe('unmatched');
});
