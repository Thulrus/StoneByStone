/**
 * Writes for a burial-index CSV import (plan §11): the people go in as one undoable group, and
 * column mappings can be saved as presets for the next export from the same society.
 */
import type { IndexPreset, NewPerson } from './format/index-csv';
import { getSetting, setSetting } from './settings';
import type { Store } from './store';

export const INDEX_PRESETS_KEY = 'indexPresets';

/** Adds the people as one undo step; returns how many were added. */
export async function importIndexPeople(
  store: Store,
  people: readonly NewPerson[],
  label: string,
): Promise<number> {
  await store.group(label, 'import', async () => {
    for (const p of people) await store.persons.create(p);
  });
  return people.length;
}

export async function listIndexPresets(store: Store): Promise<IndexPreset[]> {
  return getSetting<IndexPreset[]>(store, INDEX_PRESETS_KEY, []);
}

/** Saves `preset`, replacing one with the same name. */
export async function saveIndexPreset(store: Store, preset: IndexPreset): Promise<void> {
  const all = await listIndexPresets(store);
  const rest = all.filter((p) => p.name !== preset.name);
  await setSetting(store, INDEX_PRESETS_KEY, [...rest, preset]);
}

export async function deleteIndexPreset(store: Store, name: string): Promise<void> {
  const all = await listIndexPresets(store);
  await setSetting(
    store,
    INDEX_PRESETS_KEY,
    all.filter((p) => p.name !== name),
  );
}
