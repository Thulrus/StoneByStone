/**
 * Quick capture edits (plan §8): chips and the quick name. They join the latest undo step (the
 * stone's capture), so the in-camera Undo still undoes the whole stone. A chip is undone by
 * tapping it again.
 */
import { parseName, type ID, type Monument, type PersonName } from '../domain';
import type { Store } from './store';

export type QuickPatch = Partial<Pick<Monument, 'kind' | 'material' | 'condition' | 'flags'>>;

export async function setQuickAttributes(store: Store, id: ID, patch: QuickPatch): Promise<void> {
  await store.run('Quick edit', () => store.monuments.update(id, patch), { undoable: 'join' });
}

/** The stone's first person, made or renamed from a quick name; an empty name removes them. */
export async function setQuickName(
  store: Store,
  monumentId: ID,
  text: string,
  parsed?: PersonName,
): Promise<void> {
  const m = await store.monuments.get(monumentId);
  if (!m) return;
  const name = text.trim();
  const full = parsed ?? parseName(name);
  await store.run(
    'Quick name',
    async () => {
      const [first] = await store.persons.byMonument(monumentId);
      if (!name) {
        if (first) await store.persons.delete(first.id);
      } else if (first) {
        if (first.name.asCarved !== name) await store.persons.update(first.id, { name: full });
      } else
        await store.persons.create({
          cemeteryId: m.cemeteryId,
          monumentId,
          name: full,
          sources: [{ kind: 'stone', note: 'quick name in the field' }],
        });
    },
    { undoable: 'join' },
  );
}
