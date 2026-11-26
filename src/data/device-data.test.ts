// @vitest-environment node
import { describe, expect, test } from 'vitest';
import {
  backupMark,
  backupStatus,
  markBackedUp,
  reminderDue,
  REMIND_AFTER_MS,
  REMIND_EVERY_MS,
  unbackedStones,
} from './backup';
import { cemeteryProgress, createCemetery, listCemeteries, transcribedShare } from './cemeteries';
import {
  currentContributor,
  getCemeteryDefaults,
  getSetting,
  ONBOARDED_KEY,
  setCemeteryDefaults,
  updateContributor,
} from './settings';
import { freshStore } from './test/helpers';
import { storageUsage } from './usage';

describe('contributor', () => {
  test('starts unnamed and can be renamed; every write records it', async () => {
    const { store, db } = await freshStore();
    expect((await currentContributor(store)).displayName).toBe('');
    await updateContributor(store, { displayName: '  Ada  ', contact: ' ' });
    expect(await currentContributor(store)).toEqual({
      id: store.device.contributorId,
      displayName: 'Ada',
    });
    expect(await getSetting(store, ONBOARDED_KEY, false)).toBe(true);

    const cem = await createCemetery(store, 'Old North');
    const mon = await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    await store.monuments.update(mon.id, { notes: 'leaning' });
    const me = store.device.contributorId;
    expect(cem.contributors).toEqual([me]);
    for (const r of [cem, await store.monuments.get(mon.id)]) {
      expect(Object.values(r?.stamps ?? {}).every((s) => s.by === me)).toBe(true);
    }
    const history = await db.history.toArray();
    expect(history.length).toBeGreaterThan(0);
    expect(history.every((h) => h.by === me)).toBe(true);
  });
});

describe('cemetery defaults', () => {
  test('new cemeteries take the device defaults', async () => {
    const { store } = await freshStore();
    expect(await getCemeteryDefaults(store)).toEqual({ units: 'imperial', photoMaxPx: 1600 });
    await setCemeteryDefaults(store, { units: 'metric' });
    await setCemeteryDefaults(store, { photoMaxPx: 2400 });
    const cem = await createCemetery(store, 'Hillside');
    expect(cem.settings).toMatchObject({ units: 'metric', photoMaxPx: 2400 });
    expect(cem.license).toBe('CC-BY-4.0');
  });
});

describe('cemeteries', () => {
  test('several coexist; deleted ones are tombstoned and hidden', async () => {
    const { store } = await freshStore();
    const b = await createCemetery(store, 'Bethel');
    const a = await createCemetery(store, 'Arlington');
    const c = await createCemetery(store, 'Calvary');
    expect((await listCemeteries(store)).map((x) => x.name)).toEqual([
      'Arlington',
      'Bethel',
      'Calvary',
    ]);
    await store.cemeteries.delete(b.id);
    expect((await listCemeteries(store)).map((x) => x.id)).toEqual([a.id, c.id]);
    expect(await store.cemeteries.get(b.id, { includeDeleted: true })).toBeDefined();
    await store.undo();
    expect(await listCemeteries(store)).toHaveLength(3);
  });

  test('progress counts live stones by status', async () => {
    const { store } = await freshStore();
    const cem = await createCemetery(store, 'Old North');
    const m1 = await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    const gone = await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    await store.monuments.delete(gone.id);
    await store.persons.create({
      cemeteryId: cem.id,
      monumentId: m1.id,
      name: { surname: 'Smith' },
    });
    const p = await cemeteryProgress(store, cem.id);
    expect(p).toMatchObject({ total: 2, located: 1, transcribed: 1 });
    expect(transcribedShare(p)).toBe(0.5);
    expect(transcribedShare(await cemeteryProgress(store, 'none'))).toBe(0);
  });
});

describe('backup tracking', () => {
  test('counts changed stones and clears after a backup', async () => {
    const { store, advance } = await freshStore();
    const cem = await createCemetery(store, 'Old North');
    const m1 = await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    const m2 = await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    expect(await unbackedStones(store, cem.id)).toBe(2);

    advance(1000);
    await markBackedUp(store, cem.id);
    await markBackedUp(store, cem.id, backupMark(store));
    expect(await unbackedStones(store, cem.id)).toBe(0);

    advance(1000);
    await store.persons.create({ cemeteryId: cem.id, monumentId: m2.id, name: { surname: 'X' } });
    expect(await unbackedStones(store, cem.id)).toBe(1);
    await store.monuments.update(m1.id, { notes: 'moss' });
    expect(await unbackedStones(store, cem.id)).toBe(2);
    const [status] = await backupStatus(store);
    expect(status).toMatchObject({ cemeteryId: cem.id, unbacked: 2 });
    expect(status?.last?.at).toBeTypeOf('number');
  });

  test('reminds when work is old and not reminded today', () => {
    const now = 10 * REMIND_AFTER_MS;
    const fresh = { cemeteryId: 'a', unbacked: 3, last: { hlc: 'x', at: now - 1000 } };
    const stale = { cemeteryId: 'b', unbacked: 1, last: { hlc: 'x', at: now - REMIND_AFTER_MS } };
    const never = { cemeteryId: 'c', unbacked: 1 };
    const clean = { cemeteryId: 'd', unbacked: 0 };
    expect(reminderDue([clean], undefined, now)).toBe(false);
    expect(reminderDue([fresh], undefined, now)).toBe(false);
    expect(reminderDue([fresh, stale], undefined, now)).toBe(true);
    expect(reminderDue([never], undefined, now)).toBe(true);
    expect(reminderDue([never], now - 1000, now)).toBe(false);
    expect(reminderDue([never], now - REMIND_EVERY_MS, now)).toBe(true);
  });
});

describe('storage usage', () => {
  test('reports data and photo bytes per cemetery', async () => {
    const { store, db } = await freshStore();
    const big = await createCemetery(store, 'Big');
    const small = await createCemetery(store, 'Small');
    const mon = await store.monuments.create({ cemeteryId: big.id, kind: 'headstone' });
    const photo = await store.photos.create({
      cemeteryId: big.id,
      monumentId: mon.id,
      role: 'front',
      width: 1,
      height: 1,
      bytes: 5,
      sha256: 'ab',
    });
    await db.photoBlobs.put({ id: photo.id, blob: new Blob(['12345']) });
    await db.photoThumbs.put({ id: photo.id, blob: new Blob(['12']) });
    const usage = await storageUsage(store);
    expect(usage.map((u) => u.name)).toEqual(['Big', 'Small']);
    expect(usage[0]?.photoBytes).toBe(7);
    expect(usage[1]?.photoBytes).toBe(0);
    expect(usage[0]?.dataBytes).toBeGreaterThan(usage[1]?.dataBytes ?? 0);
    expect(usage.find((u) => u.cemeteryId === small.id)?.dataBytes).toBeGreaterThan(0);
  });
});
