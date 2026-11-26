// @vitest-environment node
import Dexie from 'dexie';
import { describe, expect, test } from 'vitest';
import { defaultCemeterySettings, isHlc } from '../domain';
import { DB_NAME, NewerSchemaError, openDatabase, probeSchemaVersion } from './db';
import { MIGRATIONS } from './migrations';
import { freshStore } from './test/helpers';

async function seed() {
  const ctx = await freshStore();
  const { store } = ctx;
  const cem = await store.cemeteries.create({
    name: 'Old North',
    contributors: [store.device.contributorId],
    settings: defaultCemeterySettings(),
  });
  const row = await store.rows.create({ cemeteryId: cem.id, label: 'Row 1' });
  const mon = await store.monuments.create({
    cemeteryId: cem.id,
    kind: 'headstone',
    address: { rowId: row.id, rowIndex: 3 },
  });
  return { ...ctx, cem, row, mon };
}

describe('database', () => {
  test('is named stonebystone', () => {
    expect(DB_NAME).toBe('stonebystone');
  });

  test('refuses a database written by a newer build (native version)', async () => {
    const name = 'newer-native';
    const newer = new Dexie(name);
    newer.version(MIGRATIONS.length + 5).stores({ settings: 'key', monuments: 'id' });
    await newer.open();
    await newer.table('monuments').put({ id: 'm1', keep: true });
    newer.close();

    await expect(openDatabase(name)).rejects.toBeInstanceOf(NewerSchemaError);
    // Nothing was altered.
    const again = new Dexie(name);
    again.version(MIGRATIONS.length + 5).stores({ settings: 'key', monuments: 'id' });
    await again.open();
    expect(await again.table('monuments').get('m1')).toEqual({ id: 'm1', keep: true });
    again.close();
  });

  test('refuses a database whose stored data version is newer', async () => {
    const { db, name } = await freshStore();
    await db.settings.put({ key: 'schemaVersion', value: 99 });
    db.close();
    const err = await openDatabase(name).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NewerSchemaError);
    expect((err as NewerSchemaError).found).toBe(99);
  });

  test('probing a missing database creates nothing', async () => {
    expect(await probeSchemaVersion('never-created')).toBeUndefined();
    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names).not.toContain('never-created');
  });

  test('reopens its own data and records the data version', async () => {
    const { db, name, store } = await freshStore();
    const node = store.device.nodeId;
    db.close();
    const db2 = await openDatabase(name);
    expect((await db2.settings.get('schemaVersion'))?.value).toBe(MIGRATIONS.length);
    expect(await probeSchemaVersion(name)).toBe(MIGRATIONS.length);
    expect((await db2.settings.get('nodeId'))?.value).toBe(node);
  });
});

describe('repositories', () => {
  test('create stamps every field with one HLC by this contributor', async () => {
    const { mon, store } = await seed();
    expect(isHlc(mon.createdAt)).toBe(true);
    expect(Object.keys(mon.stamps).sort()).toEqual(['address', 'kind']);
    expect(mon.stamps.kind).toEqual({ hlc: mon.createdAt, by: store.device.contributorId });
    expect(mon.status).toBe('located');
  });

  test('update stamps only changed fields; undefined clears a field', async () => {
    const { mon, store, advance } = await seed();
    advance(1000);
    const a = await store.monuments.update(mon.id, { kind: 'headstone', material: 'slate' });
    expect(a.stamps.kind).toEqual(mon.stamps.kind);
    expect((a.stamps.material?.hlc ?? '') > mon.createdAt).toBe(true);
    const b = await store.monuments.update(mon.id, { material: undefined });
    expect(b.material).toBeUndefined();
    expect((b.stamps.material?.hlc ?? '') > (a.stamps.material?.hlc ?? '')).toBe(true);
    const c = await store.monuments.update(mon.id, { material: undefined });
    expect(c).toEqual(b); // no-op
  });

  test('delete is a tombstone', async () => {
    const { mon, store, cem } = await seed();
    await store.monuments.delete(mon.id);
    expect(await store.monuments.get(mon.id)).toBeUndefined();
    expect((await store.monuments.get(mon.id, { includeDeleted: true }))?.deleted).toBeDefined();
    expect(await store.monuments.listByCemetery(cem.id)).toEqual([]);
  });

  test('status is materialized and indexed', async () => {
    const { mon, store, cem, db } = await seed();
    const photo = await store.photos.create({
      cemeteryId: cem.id,
      monumentId: mon.id,
      role: 'front',
      width: 1,
      height: 1,
      bytes: 1,
      sha256: 'ab',
    });
    expect((await store.monuments.get(mon.id))?.status).toBe('photographed');
    const p = await store.persons.create({
      cemeteryId: cem.id,
      monumentId: mon.id,
      name: { surname: 'Smith', given: 'John' },
    });
    expect((await store.monuments.get(mon.id))?.status).toBe('transcribed');
    const byStatus = await db.monuments
      .where('[cemeteryId+status]')
      .equals([cem.id, 'transcribed'])
      .count();
    expect(byStatus).toBe(1);
    await store.persons.delete(p.id);
    await store.photos.delete(photo.id);
    expect((await store.monuments.get(mon.id))?.status).toBe('located');
  });

  test('verified is cleared by a later transcription change', async () => {
    const { mon, store, cem } = await seed();
    await store.monuments.update(mon.id, { inscription: { text: 'IN MEMORY' } });
    const v = await store.monuments.verify(mon.id);
    expect(v.status).toBe('verified');
    await store.monuments.update(mon.id, { material: 'marble' });
    expect((await store.monuments.get(mon.id))?.status).toBe('verified');
    await store.monuments.update(mon.id, { inscription: { text: 'IN MEMORY OF' } });
    expect((await store.monuments.get(mon.id))?.verified).toBeUndefined();

    await store.monuments.verify(mon.id);
    const p = await store.persons.create({
      cemeteryId: cem.id,
      monumentId: mon.id,
      name: { surname: 'Smith' },
    });
    expect((await store.monuments.get(mon.id))?.status).toBe('transcribed');
    await store.monuments.verify(mon.id);
    await store.persons.update(p.id, { notes: 'not a transcription field' });
    expect((await store.monuments.get(mon.id))?.status).toBe('verified');
    await store.persons.update(p.id, { name: { surname: 'Smyth' } });
    expect((await store.monuments.get(mon.id))?.status).toBe('transcribed');
  });

  test('compound indexes: row order and surname', async () => {
    const { store, cem, row, db } = await seed();
    await store.monuments.create({
      cemeteryId: cem.id,
      kind: 'headstone',
      address: { rowId: row.id, rowIndex: 1 },
    });
    const inRow = await db.monuments
      .where('[cemeteryId+address.rowId+address.rowIndex]')
      .between([cem.id, row.id, Dexie.minKey], [cem.id, row.id, Dexie.maxKey])
      .toArray();
    expect(inRow.map((m) => m.address?.rowIndex)).toEqual([1, 3]);
    await store.persons.create({ cemeteryId: cem.id, name: { surname: 'Ward' } });
    expect(
      await db.persons.where('[cemeteryId+name.surname]').equals([cem.id, 'Ward']).count(),
    ).toBe(1);
  });

  test('aliases resolve and are kept in canonical order', async () => {
    const { store, cem } = await seed();
    const t = await store.tags.create({ cemeteryId: cem.id, name: 'x', aliases: ['b', 'a', 'b'] });
    expect(t.aliases).toEqual(['a', 'b']);
    expect((await store.tags.resolve('b'))?.id).toBe(t.id);
  });

  test('the clock survives a reload and never goes backwards', async () => {
    const { db, name, store, mon, time } = await seed();
    db.close();
    time.now -= 60_000; // device clock jumped back
    const store2 = await Store2(name, () => time.now);
    const m = await store2.monuments.update(mon.id, { material: 'granite' });
    expect((m.stamps.material?.hlc ?? '') > mon.createdAt).toBe(true);
    expect(store2.device.nodeId).toBe(store.device.nodeId);
  });
});

async function Store2(name: string, now: () => number) {
  const { Store } = await import('./store');
  return Store.open(await openDatabase(name), now);
}
