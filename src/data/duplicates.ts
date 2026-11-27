/**
 * "Not duplicates" answers from the duplicate review (plan §11). They are a device setting,
 * not survey data: the review never changes a record, so dismissing a pair doesn't either.
 */
import type { ID } from '../domain';
import { getSetting, setSetting } from './settings';
import type { Store } from './store';

export const dismissedKey = (cemeteryId: ID) => `duplicates:dismissed:${cemeteryId}`;

export async function listDismissed(store: Store, cemeteryId: ID): Promise<string[]> {
  return getSetting<string[]>(store, dismissedKey(cemeteryId), []);
}

/** Marks a pair (see `pairKey`) as not duplicates, or (`dismissed: false`) asks again. */
export async function setDismissed(
  store: Store,
  cemeteryId: ID,
  key: string,
  dismissed: boolean,
): Promise<void> {
  const all = new Set(await listDismissed(store, cemeteryId));
  if (dismissed) all.add(key);
  else all.delete(key);
  await setSetting(store, dismissedKey(cemeteryId), [...all].sort());
}
