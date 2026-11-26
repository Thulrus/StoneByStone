// @vitest-environment node
import { expect, test } from 'vitest';
import { defaultCemeterySettings } from '../domain';
import { freshStore } from './test/helpers';
import { saveInscription } from './transcribe';
import { captureStone } from './walk';

test('the inscription is kept as carved, one undo step, and sets the status', async () => {
  const { store } = await freshStore();
  const c = await store.cemeteries.create({
    name: 'Hill',
    contributors: [store.device.contributorId],
    settings: defaultCemeterySettings(),
  });
  const row = await store.rows.create({ cemeteryId: c.id, label: '1' });
  const m = await captureStone(store, { rowId: row.id });
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
