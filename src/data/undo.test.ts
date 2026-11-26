// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { defaultCemeterySettings } from '../domain';
import { dataFields } from './repository';
import { dump, freshStore } from './test/helpers';

async function seed() {
  const ctx = await freshStore();
  const cem = await ctx.store.cemeteries.create({
    name: 'Hillside',
    contributors: [],
    settings: defaultCemeterySettings(),
  });
  const mon = await ctx.store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
  return { ...ctx, cem, mon };
}

/**
 * Visible state: live records' data fields, without stamps (undo of an edit is a new write,
 * and undo of a create is a tombstone, which every query treats as absent).
 */
async function visible(db: Parameters<typeof dump>[0]) {
  const all = await dump(db);
  return Object.fromEntries(
    Object.entries(all).map(([t, rows]) => [
      t,
      (rows as { deleted?: unknown; status?: unknown }[])
        .filter((r) => !r.deleted)
        .map((r) => ({ ...dataFields(r), status: r.status })),
    ]),
  );
}

describe('history', () => {
  test('edits within 30 s by the same contributor coalesce', async () => {
    const { store, mon, advance } = await seed();
    advance(40_000);
    await store.monuments.update(mon.id, { material: 'slate' });
    advance(10_000);
    await store.monuments.update(mon.id, { material: 'marble', carver: 'J. Stevens' });
    const h = await store.history(mon.id);
    expect(h.map((e) => e.op)).toEqual(['create', 'update']);
    expect(h[1]?.fields).toEqual({
      material: { to: 'marble' },
      carver: { to: 'J. Stevens' },
    });
    advance(31_000);
    await store.monuments.update(mon.id, { material: 'granite' });
    expect((await store.history(mon.id)).length).toBe(3);
  });

  test('an edit followed by its undo leaves no update entry', async () => {
    const { store, mon, advance } = await seed();
    advance(40_000);
    await store.monuments.update(mon.id, { material: 'slate' });
    await store.undo();
    expect((await store.history(mon.id)).map((e) => e.op)).toEqual(['create']);
  });
});

describe('undo', () => {
  test('restores the exact prior visible state after edits, deletes and creates', async () => {
    const { store, db, mon, cem, advance } = await seed();
    await store.monuments.update(mon.id, { inscription: { text: 'HERE LIES' } });
    await store.monuments.verify(mon.id);
    const states = [await visible(db)];

    advance(5000);
    await store.monuments.update(mon.id, { inscription: { text: 'HERE LYES' }, notes: 'n' });
    states.push(await visible(db));
    const p = await store.persons.create({
      cemeteryId: cem.id,
      monumentId: mon.id,
      name: { surname: 'Ames' },
    });
    states.push(await visible(db));
    await store.persons.update(p.id, { name: { surname: 'Eames' } });
    states.push(await visible(db));
    await store.monuments.delete(mon.id);

    for (let i = states.length - 1; i >= 0; i--) {
      await store.undo();
      expect(await visible(db)).toEqual(states[i]);
    }
    expect((await store.monuments.get(mon.id))?.status).toBe('verified');
  });

  test('undo writes are newer than the change they undo', async () => {
    const { store, mon } = await seed();
    const a = await store.monuments.update(mon.id, { material: 'slate' });
    await store.undo();
    const b = await store.monuments.get(mon.id);
    expect(b?.material).toBeUndefined();
    expect((b?.stamps.material?.hlc ?? '') > (a.stamps.material?.hlc ?? '')).toBe(true);
  });

  test('a group is one undo step and restores records exactly, stamps included', async () => {
    const { store, db, mon, cem } = await seed();
    const before = await dump(db);
    const beforeHistory = await db.history.count();
    await store.group('Import', 'import', async (ctx) => {
      await store.monuments.upsertMerged(ctx, {
        ...mon,
        material: 'slate',
        stamps: {
          ...mon.stamps,
          material: { hlc: '999999999999999-00000-ffffffffffffffff', by: 'x' },
        },
      });
      await store.persons.upsertMerged(ctx, {
        id: 'p-imported',
        cemeteryId: cem.id,
        createdAt: mon.createdAt,
        monumentId: mon.id,
        name: { surname: 'Ames' },
        stamps: { name: { hlc: mon.createdAt, by: 'x' } },
      });
    });
    expect(store.undoStack.size).toBe(3);
    expect((await store.monuments.get(mon.id))?.status).toBe('transcribed');
    expect(await db.history.where('group').notEqual('').count()).toBe(2);
    await store.undo();
    expect(await dump(db)).toEqual(before);
    expect(await db.history.count()).toBe(beforeHistory);
  });

  test('a failed operation changes nothing and pushes no undo step', async () => {
    const { store, db } = await seed();
    const before = await dump(db);
    const size = store.undoStack.size;
    await expect(
      store.group('Bad import', 'import', async (ctx) => {
        await store.tags.upsertMerged(ctx, {
          id: 't',
          cemeteryId: 'c',
          createdAt: '',
          name: 'x',
          stamps: {},
        });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await dump(db)).toEqual(before);
    expect(store.undoStack.size).toBe(size);
  });
});
