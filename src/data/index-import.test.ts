import { expect, test } from 'vitest';
import { defaultCemeterySettings } from '../domain';
import { presetFromMapping } from './format/index-csv';
import {
  deleteIndexPreset,
  importIndexPeople,
  listIndexPresets,
  saveIndexPreset,
} from './index-import';
import { freshStore } from './test/helpers';

test('an index import adds people as one undo step', async () => {
  const { store } = await freshStore();
  const c = await store.cemeteries.create({
    name: 'Hill',
    contributors: [store.device.contributorId],
    settings: defaultCemeterySettings(),
  });
  const people = ['Smith', 'Peck', 'Jones'].map((surname) => ({
    cemeteryId: c.id,
    name: { surname },
    matchStatus: 'unmatched' as const,
    sources: [{ kind: 'imported-index' as const, ref: 'x.csv, line 2' }],
  }));
  expect(await importIndexPeople(store, people, 'Import x.csv')).toBe(3);
  const saved = await store.persons.listByCemetery(c.id);
  expect(saved.map((p) => p.name.surname).sort()).toEqual(['Jones', 'Peck', 'Smith']);
  expect(saved.every((p) => p.monumentId === undefined && p.stamps.sources)).toBe(true);

  await store.undo();
  expect(await store.persons.listByCemetery(c.id)).toEqual([]);
});

test('presets save by name, replace, and delete', async () => {
  const { store } = await freshStore();
  const a = presetFromMapping('Society', ['Surname'], ['surname'], true, 'en-US');
  await saveIndexPreset(store, a);
  await saveIndexPreset(store, { ...a, dateLocale: 'en-GB' });
  await saveIndexPreset(store, { ...a, name: 'Church' });
  expect((await listIndexPresets(store)).map((p) => [p.name, p.dateLocale])).toEqual([
    ['Society', 'en-GB'],
    ['Church', 'en-US'],
  ]);
  await deleteIndexPreset(store, 'Society');
  expect((await listIndexPresets(store)).map((p) => p.name)).toEqual(['Church']);
});
