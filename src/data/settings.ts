/**
 * Device-level settings (plan §19 implementation notes) and the contributor this device writes
 * as. Settings live in the `settings` table next to `nodeId` and `clock`; they are not survey
 * data, so they are neither stamped nor undoable.
 */
import { defaultCemeterySettings, type CemeterySettings, type Contributor } from '../domain';
import type { Store } from './store';

export const CEMETERY_DEFAULTS_KEY = 'cemeteryDefaults';
/** Set once the first-launch name prompt has been answered or skipped. */
export const ONBOARDED_KEY = 'onboarded';

export async function getSetting<T>(store: Store, key: string, fallback: T): Promise<T> {
  const row = await store.db.settings.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(store: Store, key: string, value: unknown): Promise<void> {
  await store.db.settings.put({ key, value });
}

/** Settings copied into each new cemetery; each cemetery can change its own later. */
export type CemeteryDefaults = Pick<CemeterySettings, 'units' | 'photoMaxPx'>;

export async function getCemeteryDefaults(store: Store): Promise<CemeteryDefaults> {
  const base = defaultCemeterySettings();
  const saved = await getSetting<Partial<CemeteryDefaults>>(store, CEMETERY_DEFAULTS_KEY, {});
  return {
    units: saved.units ?? base.units,
    photoMaxPx: saved.photoMaxPx ?? base.photoMaxPx,
  };
}

export async function setCemeteryDefaults(
  store: Store,
  patch: Partial<CemeteryDefaults>,
): Promise<void> {
  await setSetting(store, CEMETERY_DEFAULTS_KEY, {
    ...(await getCemeteryDefaults(store)),
    ...patch,
  });
}

/** The contributor every write on this device is stamped with. */
export async function currentContributor(store: Store): Promise<Contributor> {
  const id = store.device.contributorId;
  return (await store.db.contributors.get(id)) ?? { id, displayName: '' };
}

/** Rename this device's contributor. Earlier writes keep the same id, so they follow along. */
export async function updateContributor(
  store: Store,
  { displayName, contact }: { displayName: string; contact?: string },
): Promise<void> {
  const me = await currentContributor(store);
  const next: Contributor = { id: me.id, displayName: displayName.trim() };
  const c = contact?.trim();
  if (c) next.contact = c;
  await store.putContributor(next);
  await setSetting(store, ONBOARDED_KEY, true);
}
