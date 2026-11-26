import { afterEach, describe, expect, it, vi } from 'vitest';
import { unbackedStones } from '../../data/backup';
import { createCemetery } from '../../data/cemeteries';
import { testStore } from '../../test/render';
import { backupFileName, finishBackup, needsFreshTap, prepareBackup } from './backup';

function phone(share: () => Promise<void>) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
  Object.assign(navigator, { canShare: () => true, share: vi.fn(share) });
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
});

describe('backup', () => {
  it('names files after the cemetery and date', () => {
    const d = new Date('2026-05-04T12:00:00Z');
    expect(backupFileName('St. Mary’s Churchyard', d)).toBe('st-mary-s-churchyard-2026-05-04.sbs');
    expect(backupFileName('Cmentarz Łyczakowski', d)).toBe('cmentarz-łyczakowski-2026-05-04.sbs');
    expect(backupFileName('!!!', d)).toBe('cemetery-2026-05-04.sbs');
  });

  it('shares on phones and marks the cemeteries backed up', async () => {
    const store = await testStore();
    const cem = await createCemetery(store, 'Old North');
    await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    phone(() => Promise.resolve());
    const prepared = await prepareBackup(store);
    expect(prepared.files.map((f) => f.name)).toEqual([expect.stringMatching(/^old-north-/)]);
    expect(await finishBackup(store, prepared)).toEqual({ method: 'share' });
    expect(await unbackedStones(store, cem.id)).toBe(0);
  });

  it('a cancelled share is not a backup', async () => {
    const store = await testStore();
    const cem = await createCemetery(store, 'Old North');
    await store.monuments.create({ cemeteryId: cem.id, kind: 'headstone' });
    phone(() => Promise.reject(new DOMException('no', 'AbortError')));
    expect(await finishBackup(store, await prepareBackup(store))).toEqual({ method: 'cancelled' });
    expect(await unbackedStones(store, cem.id)).toBe(1);
  });

  it('asks for a fresh tap when the browser wants one', async () => {
    const store = await testStore();
    await createCemetery(store, 'Old North');
    phone(() => Promise.reject(new DOMException('late', 'NotAllowedError')));
    const err = await finishBackup(store, await prepareBackup(store)).catch((e: unknown) => e);
    expect(needsFreshTap(err)).toBe(true);
  });
});
