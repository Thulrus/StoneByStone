// @vitest-environment node
import { expect, test } from 'vitest';
import { defaultCemeterySettings } from '../domain';
import { freshStore } from './test/helpers';
import {
  personDraft,
  emptyPerson,
  saveInscription,
  saveTranscription,
  type TranscriptionDraft,
} from './transcribe';
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

test('the inscription is kept as carved, one undo step, and sets the status', async () => {
  const { store, m } = await setup();
  const steps = store.undoStack.size;
  await saveInscription(store, m.id, 'IN MEMORY OF\n  JOHN SMITH\n\n');
  expect(await store.monuments.get(m.id)).toMatchObject({
    inscription: { text: 'IN MEMORY OF\n  JOHN SMITH' },
    status: 'transcribed',
  });
  await saveInscription(store, m.id, 'IN MEMORY OF\n  JOHN SMITH');
  expect(store.undoStack.size).toBe(steps + 1);
  await saveInscription(store, m.id, '  ');
  expect((await store.monuments.get(m.id))?.inscription).toBeUndefined();
  await store.undo();
  expect((await store.monuments.get(m.id))?.inscription?.text).toBe('IN MEMORY OF\n  JOHN SMITH');
});

test('people are parsed, re-saved without duplicates, and removed when emptied', async () => {
  const { store, m } = await setup();
  const p = { ...emptyPerson(store.newId()), name: 'Mary A. Brown', died: 'Mar. 3, 1850?' };
  const draft: TranscriptionDraft = { inscription: 'MARY', epitaph: 'At rest', people: [p] };
  await saveTranscription(store, m.id, draft);
  await saveTranscription(store, m.id, {
    ...draft,
    people: [{ ...p, age: '42 yrs. 3 mos.', relationship: 'wife of John' }],
  });
  const [saved, ...more] = await store.persons.byMonument(m.id);
  expect(more).toHaveLength(0);
  expect(saved).toMatchObject({
    id: p.id,
    name: { asCarved: 'Mary A. Brown', given: 'Mary', surname: 'Brown' },
    death: { original: 'Mar. 3, 1850?', y: 1850, m: 3, d: 3, qualifier: 'about' },
    age: { y: 42, m: 3 },
    relationshipText: 'wife of John',
  });
  expect((await store.monuments.get(m.id))?.epitaph).toBe('At rest');

  // Emptied: removed. Typed again under the same draft: back, still one person.
  await saveTranscription(store, m.id, { ...draft, people: [emptyPerson(p.id)] });
  expect(await store.persons.byMonument(m.id)).toHaveLength(0);
  const renamed = await saveTranscription(store, m.id, {
    ...draft,
    people: [{ ...p, name: 'Mary Brown' }],
  });
  const again = await store.persons.byMonument(m.id);
  expect(again.map((x) => x.name.asCarved)).toEqual(['Mary Brown']);
  // A new id, not the tombstoned one (a tombstone wins on merge).
  expect(renamed[p.id]).toBe(again[0]?.id);
  expect(renamed[p.id]).not.toBe(p.id);
});

test('a blank Born is calculated from Died and Age, and follows them', async () => {
  const { store, m } = await setup();
  const p = { ...emptyPerson(store.newId()), name: 'Eli Hart', died: '1887', age: 'Æ 72' };
  const draft: TranscriptionDraft = { inscription: '', epitaph: '', people: [p] };
  await saveTranscription(store, m.id, draft);
  const [saved] = await store.persons.byMonument(m.id);
  expect(saved?.birth).toMatchObject({ y: 1815, qualifier: 'calculated' });
  expect(saved && personDraft(saved).born).toBe('');

  await saveTranscription(store, m.id, { ...draft, people: [{ ...p, age: '70' }] });
  expect((await store.persons.get(p.id))?.birth).toMatchObject({ y: 1817 });
  await saveTranscription(store, m.id, { ...draft, people: [{ ...p, age: '70', born: '1816' }] });
  expect((await store.persons.get(p.id))?.birth).toEqual({ original: '1816', y: 1816 });
});
