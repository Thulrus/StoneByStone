// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { createCemetery } from './cemeteries';
import {
  addRows,
  addSection,
  listRows,
  listSections,
  moveRow,
  moveSection,
  rowStoneCounts,
  setRowSection,
} from './layout';
import { freshStore } from './test/helpers';

async function setup() {
  const { store } = await freshStore();
  const cem = await createCemetery(store, 'Old North');
  return { store, cem };
}

const labels = (rows: { label: string }[]) => rows.map((r) => r.label);

describe('sections and rows', () => {
  test('adds rows in order, per section, as one undo step', async () => {
    const { store, cem } = await setup();
    const a = await addSection(store, cem.id, ' A ');
    await addRows(store, cem.id, a.id, ['1', '2', '3']);
    await addRows(store, cem.id, null, ['X']);
    await addRows(store, cem.id, a.id, ['4']);
    expect(a.name).toBe('A');
    expect(labels(await listRows(store, cem.id, a.id))).toEqual(['1', '2', '3', '4']);
    expect(labels(await listRows(store, cem.id, null))).toEqual(['X']);
    expect(await listRows(store, cem.id)).toHaveLength(5);

    await store.undo();
    await store.undo();
    await store.undo();
    expect(await listRows(store, cem.id, a.id)).toEqual([]);
  });

  test('reorders sections and rows without gaps', async () => {
    const { store, cem } = await setup();
    const a = await addSection(store, cem.id, 'A');
    const b = await addSection(store, cem.id, 'B');
    await moveSection(store, cem.id, b.id, -1);
    expect((await listSections(store, cem.id)).map((s) => s.name)).toEqual(['B', 'A']);
    await moveSection(store, cem.id, b.id, -1); // already first: no-op
    expect((await listSections(store, cem.id)).map((s) => s.name)).toEqual(['B', 'A']);

    const [r1, , r3] = await addRows(store, cem.id, a.id, ['1', '2', '3']);
    await moveRow(store, r3!, -1);
    expect(labels(await listRows(store, cem.id, a.id))).toEqual(['1', '3', '2']);
    await moveRow(store, r1!, 1);
    expect(labels(await listRows(store, cem.id, a.id))).toEqual(['3', '1', '2']);
    await store.undo();
    expect(labels(await listRows(store, cem.id, a.id))).toEqual(['1', '3', '2']);
  });

  test('moves a row between sections, and shows rows of deleted sections as unsectioned', async () => {
    const { store, cem } = await setup();
    const a = await addSection(store, cem.id, 'A');
    const b = await addSection(store, cem.id, 'B');
    const [r] = await addRows(store, cem.id, a.id, ['1']);
    await addRows(store, cem.id, b.id, ['9']);
    await setRowSection(store, r!, b.id);
    expect(labels(await listRows(store, cem.id, b.id))).toEqual(['9', '1']);
    await store.sections.delete(b.id);
    expect(labels(await listRows(store, cem.id, null))).toEqual(['9', '1']);
  });

  test('counts stones per row', async () => {
    const { store, cem } = await setup();
    const [r] = await addRows(store, cem.id, null, ['1']);
    await store.monuments.create({
      cemeteryId: cem.id,
      kind: 'headstone',
      address: { rowId: r!.id },
    });
    await store.monuments.create({
      cemeteryId: cem.id,
      kind: 'headstone',
      address: { rowId: r!.id },
    });
    expect((await rowStoneCounts(store, cem.id)).get(r!.id)).toBe(2);
  });
});
