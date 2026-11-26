// @vitest-environment node
import { expect, test } from 'vitest';
import { defaultCemeterySettings, toggleIn, CONDITIONS } from '../domain';
import { setQuickAttributes, setQuickName } from './quick';
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
  const m = await captureStone(store, { rowId: row.id });
  return { store, m };
}

test("chips and quick name join the stone's undo step", async () => {
  const { store, m } = await setup();
  await setQuickAttributes(store, m.id, { kind: 'obelisk', material: 'slate' });
  await setQuickAttributes(store, m.id, { condition: ['tilted', 'sunken'] });
  await setQuickName(store, m.id, 'John Smith');
  const after = await store.monuments.get(m.id);
  expect(after).toMatchObject({ kind: 'obelisk', material: 'slate', status: 'transcribed' });
  const [p] = await store.persons.byMonument(m.id);
  expect(p?.name).toMatchObject({ given: 'John', surname: 'Smith' });

  // Renaming keeps one person; clearing removes them.
  await setQuickName(store, m.id, 'Jon Smith');
  expect(await store.persons.byMonument(m.id)).toHaveLength(1);
  await setQuickName(store, m.id, '');
  expect(await store.persons.byMonument(m.id)).toHaveLength(0);

  // The one undo step left is the stone itself.
  await store.undo();
  const gone = await store.monuments.get(m.id);
  expect(!gone || gone.deleted !== undefined).toBe(true);
});

test('undoing a named stone removes its person too', async () => {
  const { store, m } = await setup();
  const steps = store.undoStack.size;
  await setQuickName(store, m.id, 'John Smith');
  expect(store.undoStack.size).toBe(steps);
  await store.undo();
  const live = (await store.db.persons.toArray()).filter((p) => !p.deleted);
  expect(live).toHaveLength(0);
  expect(store.undoStack.size).toBe(steps - 1);
});

test('a surname-only quick name is a surname', async () => {
  const { store, m } = await setup();
  await setQuickName(store, m.id, 'Smith', { asCarved: 'Smith', surname: 'Smith' });
  expect((await store.persons.byMonument(m.id))[0]?.name.surname).toBe('Smith');
});

test('toggleIn keeps the vocabulary order', () => {
  expect(toggleIn(['tilted'], 'good', CONDITIONS)).toEqual(['good', 'tilted']);
  expect(toggleIn(['good', 'tilted'], 'good', CONDITIONS)).toEqual(['tilted']);
});
