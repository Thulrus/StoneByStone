/**
 * Linking imported index records to stones (plan §11 Match view). Each call is one undo step.
 *
 * - **Attach**: a stone with nobody on it yet gets the record as its person.
 * - **Merge**: the record is the same human as a person already transcribed on the stone. The
 *   person keeps the stone's spelling and gains the record's source and id (`aliases`) and
 *   any fields it had blank (dates, age, military, …); the record is tombstoned.
 * - **Unlink** undoes either: an attached record leaves its stone; a merged one is split back
 *   out as a new record, and the fields the merge filled in are cleared again.
 */
import { deepEqual, isIndexRecord, type ID, type Person, type Source } from '../domain';
import { dataFields, type NewRecord } from './repository';
import type { Store } from './store';

/** Person fields a merge may fill in when the stone's person has them blank. */
export const FILLABLE = [
  'sex',
  'birth',
  'death',
  'burial',
  'age',
  'relationshipText',
  'military',
  'occupation',
  'notes',
] as const;

export async function attachToStone(store: Store, recordId: ID, stoneId: ID): Promise<void> {
  await store.persons.update(recordId, { monumentId: stoneId, matchStatus: 'matched' });
}

export async function mergeIntoPerson(store: Store, recordId: ID, personId: ID): Promise<void> {
  await store.run('Match index record', async () => {
    const record = await store.persons.get(recordId);
    const person = await store.persons.get(personId);
    if (!record || !person) throw new Error('person not found');
    const patch: Partial<Person> = {
      aliases: [...new Set([...(person.aliases ?? []), record.id])],
      sources: [...(person.sources ?? []), ...(record.sources ?? [])],
      matchStatus: 'matched',
    };
    for (const k of FILLABLE) {
      if (person[k] === undefined && record[k] !== undefined) {
        (patch as Record<string, unknown>)[k] = record[k];
      }
    }
    await store.persons.update(personId, patch);
    await store.persons.delete(recordId);
  });
}

export async function setNoStoneFound(store: Store, recordId: ID, none: boolean): Promise<void> {
  await store.persons.update(recordId, { matchStatus: none ? 'no-stone-found' : 'unmatched' });
}

/** A matched index record, as the Match view lists it. */
export type MatchedItem =
  | { kind: 'attached'; person: Person; record: Person }
  | { kind: 'merged'; person: Person; record: Person };

/**
 * Index records that are linked to a stone: attached ones (live, with a stone), and merged
 * ones (tombstoned, named in a live person's `aliases`). Needs deleted people too.
 */
export function matchedItems(peopleWithDeleted: readonly Person[]): MatchedItem[] {
  const byId = new Map(peopleWithDeleted.map((p) => [p.id, p]));
  const out: MatchedItem[] = [];
  for (const p of peopleWithDeleted) {
    if (p.deleted || p.matchStatus !== 'matched') continue;
    const merged = (p.aliases ?? [])
      .map((a) => byId.get(a))
      .filter((r): r is Person => !!r?.deleted && isIndexRecord(r));
    for (const r of merged) out.push({ kind: 'merged', person: p, record: r });
    // An index source that no merged record brought is the person's own: it was attached.
    const brought = merged.flatMap((r) => r.sources ?? []);
    const own = (p.sources ?? []).some(
      (s) => s.kind === 'imported-index' && !brought.some((b) => deepEqual(b, s)),
    );
    if (own && p.monumentId) out.push({ kind: 'attached', person: p, record: p });
  }
  return out;
}

export async function unlink(store: Store, item: MatchedItem): Promise<void> {
  if (item.kind === 'attached') {
    await store.persons.update(item.record.id, {
      monumentId: undefined,
      matchStatus: 'unmatched',
    });
    return;
  }
  await store.run('Unmatch index record', async () => {
    const person = await store.persons.get(item.person.id);
    if (!person) throw new Error('person not found');
    const r = item.record;
    // Fields the merge filled were written with the same stamp as the alias.
    const mergeHlc = person.stamps.aliases?.hlc;
    const patch: Partial<Person> = {
      aliases: (person.aliases ?? []).filter((a) => a !== r.id),
      sources: (person.sources ?? []).filter(
        (s: Source) => !(r.sources ?? []).some((x) => deepEqual(x, s)),
      ),
    };
    for (const k of FILLABLE) {
      if (
        mergeHlc !== undefined &&
        person.stamps[k]?.hlc === mergeHlc &&
        deepEqual(person[k], r[k])
      ) {
        (patch as Record<string, unknown>)[k] = undefined;
      }
    }
    if (!(patch.sources ?? []).some((s) => s.kind === 'imported-index')) {
      patch.matchStatus = undefined;
    }
    if (patch.aliases?.length === 0) patch.aliases = undefined;
    if (patch.sources?.length === 0) patch.sources = undefined;
    await store.persons.update(person.id, patch);
    // A fresh record rather than an undeleted one: a peer's tombstone would win a merge.
    const fields = dataFields(r) as NewRecord<Person>;
    const { monumentId: _m, aliases: _a, ...rest } = fields;
    await store.persons.create({ ...rest, cemeteryId: r.cemeteryId, matchStatus: 'unmatched' });
  });
}
