/** People and the links between them (plan §10.3). Each change is one undo step. */
import { inverseRelation, type ID, type Person, type PersonRelationType } from '../domain';
import type { Store } from './store';

type Relations = NonNullable<Person['relations']>;

const without = (rels: Relations | undefined, id: ID) =>
  (rels ?? []).filter((r) => r.personId !== id);

async function setLink(store: Store, from: Person, to: ID, type: PersonRelationType | undefined) {
  const rels = without(from.relations, to);
  if (type) rels.push({ type, personId: to });
  await store.persons.update(from.id, { relations: rels.length ? rels : undefined });
}

/** `b` is `a`'s `type` (and so `a` is `b`'s inverse), replacing any earlier link between them. */
export async function linkPeople(
  store: Store,
  aId: ID,
  bId: ID,
  type: PersonRelationType,
): Promise<void> {
  if (aId === bId) return;
  await store.run('Link people', async () => {
    const [a, b] = await Promise.all([store.persons.get(aId), store.persons.get(bId)]);
    if (!a || !b) return;
    await setLink(store, a, bId, type);
    await setLink(store, b, aId, inverseRelation(type));
  });
}

export async function unlinkPeople(store: Store, aId: ID, bId: ID): Promise<void> {
  await store.run('Unlink people', async () => {
    const [a, b] = await Promise.all([store.persons.get(aId), store.persons.get(bId)]);
    if (a) await setLink(store, a, bId, undefined);
    if (b) await setLink(store, b, aId, undefined);
  });
}

/** Remove a person and every link to them. */
export async function removePerson(store: Store, id: ID): Promise<void> {
  await store.run('Remove person', async () => {
    const p = await store.persons.get(id);
    if (!p) return;
    for (const r of p.relations ?? []) {
      const other = await store.persons.get(r.personId);
      if (other) await setLink(store, other, id, undefined);
    }
    await store.persons.delete(id);
  });
}
