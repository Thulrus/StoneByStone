// @vitest-environment node
import { expect, test } from 'vitest';
import { defaultCemeterySettings, parseName } from '../domain';
import { linkPeople, removePerson, unlinkPeople } from './people';
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
  const couple = await captureStone(store, { rowId: row.id });
  const childStone = await captureStone(store, { rowId: row.id });
  const person = (monumentId: string, name: string) =>
    store.persons.create({ cemeteryId: c.id, monumentId, name: parseName(name) });
  const john = await person(couple.id, 'John Brown');
  const mary = await person(couple.id, 'Mary Brown');
  const amos = await person(childStone.id, 'Amos Brown');
  return { store, john, mary, amos };
}

const rels = async (store: Awaited<ReturnType<typeof setup>>['store'], id: string) =>
  (await store.persons.get(id))?.relations ?? [];

test('a couple on one stone and their son on the next: both sides kept', async () => {
  const { store, john, mary, amos } = await setup();
  await linkPeople(store, mary.id, john.id, 'spouse');
  await linkPeople(store, amos.id, john.id, 'parent');
  await linkPeople(store, amos.id, mary.id, 'parent');
  expect(await rels(store, john.id)).toEqual([
    { type: 'spouse', personId: mary.id },
    { type: 'child', personId: amos.id },
  ]);
  expect(await rels(store, amos.id)).toEqual([
    { type: 'parent', personId: john.id },
    { type: 'parent', personId: mary.id },
  ]);

  // Relinking replaces; one undo step per link.
  await linkPeople(store, amos.id, mary.id, 'sibling');
  expect(await rels(store, mary.id)).toContainEqual({ type: 'sibling', personId: amos.id });
  await store.undo();
  expect(await rels(store, mary.id)).toContainEqual({ type: 'child', personId: amos.id });

  await unlinkPeople(store, mary.id, john.id);
  expect(await rels(store, john.id)).toEqual([{ type: 'child', personId: amos.id }]);

  // Removing a person clears links to them.
  await removePerson(store, amos.id);
  expect(await rels(store, john.id)).toEqual([]);
  expect(await rels(store, mary.id)).toEqual([]);
  await store.undo();
  expect(await rels(store, john.id)).toEqual([{ type: 'child', personId: amos.id }]);
});
