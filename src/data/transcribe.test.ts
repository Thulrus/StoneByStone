// @vitest-environment node
import { expect, test } from 'vitest';
import { defaultCemeterySettings } from '../domain';
import { freshStore } from './test/helpers';
import {
  personDraft,
  emptyPerson,
  saveInscription,
  saveTranscription,
  unverifyStone,
  verifyStone,
  type TranscriptionDraft,
} from './transcribe';
import { captureStone } from './walk';

const STONE = { symbols: [], carver: '', language: '', script: '' };

async function setup() {
  const { store } = await freshStore();
  const c = await store.cemeteries.create({
    name: 'Hill',
    contributors: [store.device.contributorId],
    settings: defaultCemeterySettings(),
  });
  const row = await store.rows.create({ cemeteryId: c.id, label: '1' });
  const m = await captureStone(store, { rowId: row.id });
  return { store, m, c };
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
  const draft: TranscriptionDraft = {
    ...STONE,
    inscription: 'MARY',
    epitaph: 'At rest',
    people: [p],
  };
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
  const draft: TranscriptionDraft = { ...STONE, inscription: '', epitaph: '', people: [p] };
  await saveTranscription(store, m.id, draft);
  const [saved] = await store.persons.byMonument(m.id);
  expect(saved?.birth).toMatchObject({ y: 1815, qualifier: 'calculated' });
  expect(saved && personDraft(saved).born).toBe('');

  await saveTranscription(store, m.id, { ...draft, people: [{ ...p, age: '70' }] });
  expect((await store.persons.get(p.id))?.birth).toMatchObject({ y: 1817 });
  await saveTranscription(store, m.id, { ...draft, people: [{ ...p, age: '70', born: '1816' }] });
  expect((await store.persons.get(p.id))?.birth).toEqual({ original: '1816', y: 1816 });
});

test('symbols, carver, language and script, with the convention the text was typed in', async () => {
  const { store, m, c } = await setup();
  const draft: TranscriptionDraft = {
    ...STONE,
    inscription: 'Hier ruhet\nJOHANN [?]',
    epitaph: '',
    people: [],
    symbols: ['willow-urn', 'anchor'],
    carver: ' J. Stevens, Newport ',
    language: 'de',
    script: 'Latf',
  };
  await saveTranscription(store, m.id, draft);
  expect(await store.monuments.get(m.id)).toMatchObject({
    symbols: ['willow-urn', 'anchor'],
    carver: 'J. Stevens, Newport',
    inscription: {
      text: 'Hier ruhet\nJOHANN [?]',
      language: 'de',
      script: 'Latf',
      convention: 'as-carved',
    },
  });

  // A new convention applies to text typed from now on, not to what's already there.
  await store.cemeteries.update(c.id, {
    settings: { ...c.settings, transcriptionConvention: 'dashes' },
  });
  await saveTranscription(store, m.id, { ...draft, script: '' });
  const kept = (await store.monuments.get(m.id))?.inscription;
  expect(kept).toEqual({ text: 'Hier ruhet\nJOHANN [?]', language: 'de', convention: 'as-carved' });
  await saveTranscription(store, m.id, { ...draft, inscription: 'Hier ruhet\nJOHANN (?)' });
  expect((await store.monuments.get(m.id))?.inscription?.convention).toBe('dashes');

  await saveTranscription(store, m.id, { ...STONE, inscription: '', epitaph: '', people: [] });
  const cleared = await store.monuments.get(m.id);
  expect([cleared?.symbols, cleared?.carver, cleared?.inscription]).toEqual([
    undefined,
    undefined,
    undefined,
  ]);
});

test('military service is saved per person and cleared when emptied', async () => {
  const { store, m } = await setup();
  const p = {
    ...emptyPerson(store.newId()),
    name: 'Asa Hart',
    conflict: 'Civil War (Union)',
    rank: 'Corp.',
    unit: 'Co. B, 12th Vt. Inf.',
    marker: 'GAR star',
  };
  const draft: TranscriptionDraft = { ...STONE, inscription: '', epitaph: '', people: [p] };
  await saveTranscription(store, m.id, draft);
  expect((await store.persons.get(p.id))?.military).toEqual({
    conflict: 'Civil War (Union)',
    rank: 'Corp.',
    unit: 'Co. B, 12th Vt. Inf.',
    marker: 'GAR star',
  });
  await saveTranscription(store, m.id, {
    ...draft,
    people: [{ ...p, conflict: '', rank: '', unit: '', marker: '' }],
  });
  expect((await store.persons.get(p.id))?.military).toBeUndefined();
});

test('verify pass: transitions, and later edits clear it', async () => {
  const { store, m } = await setup();
  const status = async () => (await store.monuments.get(m.id))?.status;
  expect(await status()).toBe('located');
  // Nothing transcribed: can't be verified.
  expect(await verifyStone(store, m.id)).toBe(false);
  expect(await status()).toBe('located');

  // Edits and the mark together, one undo step.
  const p = { ...emptyPerson(store.newId()), name: 'Eli Hart', died: '1887' };
  const draft: TranscriptionDraft = { ...STONE, inscription: 'ELI HART', epitaph: '', people: [p] };
  const steps = store.undoStack.size;
  expect(await verifyStone(store, m.id, draft)).toBe(true);
  expect(store.undoStack.size).toBe(steps + 1);
  expect(await status()).toBe('verified');
  expect((await store.monuments.get(m.id))?.verified?.by).toBe(store.device.contributorId);
  await store.undo();
  expect(await status()).toBe('located');
  // Undo tombstoned that person, so the next draft has a fresh one.
  const q = { ...p, id: store.newId() };
  expect(await verifyStone(store, m.id, { ...draft, people: [q] })).toBe(true);

  // Saving the same text keeps it verified; a changed field clears it.
  await saveTranscription(store, m.id, { ...draft, people: [q] });
  expect(await status()).toBe('verified');
  await saveTranscription(store, m.id, { ...draft, people: [{ ...q, died: '1888' }] });
  expect(await status()).toBe('transcribed');
  expect(await verifyStone(store, m.id)).toBe(true);
  await saveTranscription(store, m.id, { ...draft, people: [{ ...q, died: '1888' }], carver: 'X' });
  expect(await status()).toBe('transcribed');
  expect(await verifyStone(store, m.id)).toBe(true);
  await saveTranscription(store, m.id, {
    ...draft,
    people: [{ ...q, died: '1888' }],
    carver: 'X',
    inscription: 'ELI HAR[?]',
  });
  expect(await status()).toBe('transcribed');

  // Unmarking keeps the transcription.
  expect(await verifyStone(store, m.id)).toBe(true);
  await unverifyStone(store, m.id);
  expect(await status()).toBe('transcribed');
});
