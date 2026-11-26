/**
 * Per-device imagery settings: custom sources and API keys (plan §24). Keys are personal
 * credentials, so they live in the device `settings` table and never in survey data or exports.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useStore } from '../../app/store-context';
import { getSetting, setSetting } from '../../data/settings';
import type { Store } from '../../data/store';
import type { CustomSource, ImageryKeys } from './imagery';

const SOURCES_KEY = 'imagerySources';
const KEYS_KEY = 'imageryKeys';

export const getCustomSources = (store: Store) =>
  getSetting<CustomSource[]>(store, SOURCES_KEY, []);
export const getImageryKeys = (store: Store) => getSetting<ImageryKeys>(store, KEYS_KEY, {});

export async function saveCustomSource(store: Store, source: CustomSource): Promise<void> {
  const all = await getCustomSources(store);
  await setSetting(store, SOURCES_KEY, [...all.filter((s) => s.id !== source.id), source]);
}

export async function removeCustomSource(store: Store, id: string): Promise<void> {
  const all = await getCustomSources(store);
  await setSetting(
    store,
    SOURCES_KEY,
    all.filter((s) => s.id !== id),
  );
}

export async function setImageryKey(store: Store, name: keyof ImageryKeys, value: string) {
  const keys: ImageryKeys = { ...(await getImageryKeys(store)), [name]: value.trim() || undefined };
  await setSetting(store, KEYS_KEY, keys);
}

export interface ImagerySettings {
  custom: CustomSource[];
  keys: ImageryKeys;
}

/** `undefined` while loading. */
export function useImagerySettings(): ImagerySettings | undefined {
  const store = useStore();
  return useLiveQuery(
    async () => ({ custom: await getCustomSources(store), keys: await getImageryKeys(store) }),
    [store],
  );
}
