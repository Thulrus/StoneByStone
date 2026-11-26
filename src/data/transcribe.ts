/** Desk-mode transcription writes (plan §9). Each save is one undo step. */
import { parseAge, parseDate, parseName, type ID, type Person } from '../domain';
import type { Store } from './store';

/** One person on the stone, as typed. `id` is made up front, so a re-save never duplicates. */
export interface PersonDraft {
  id: ID;
  name: string;
  born: string;
  died: string;
  age: string;
  relationship: string;
}

export interface TranscriptionDraft {
  inscription: string;
  epitaph: string;
  people: PersonDraft[];
}

/** As carved: line breaks and leading spaces kept, only trailing blank space dropped. */
const carved = (text: string) => text.replace(/\s+$/u, '');

export const emptyPerson = (id: ID): PersonDraft => ({
  id,
  name: '',
  born: '',
  died: '',
  age: '',
  relationship: '',
});

export const personDraft = (p: Person): PersonDraft => ({
  id: p.id,
  name: p.name.asCarved ?? [p.name.given, p.name.surname].filter(Boolean).join(' '),
  born: p.birth?.original ?? '',
  died: p.death?.original ?? '',
  age: p.age?.original ?? '',
  relationship: p.relationshipText ?? '',
});

export const isBlank = (d: PersonDraft): boolean =>
  !(d.name + d.born + d.died + d.age + d.relationship).trim();

/** Only the fields whose typed text changed, parsed (names, fuzzy dates, ages). */
function personPatch(d: PersonDraft, was: PersonDraft | undefined, dateLocale: string) {
  const patch: Partial<Person> = {};
  const changed = (k: keyof PersonDraft) => !was || was[k].trim() !== d[k].trim();
  const text = (k: keyof PersonDraft) => d[k].trim();
  if (changed('name')) patch.name = text('name') ? parseName(text('name')) : {};
  if (changed('born'))
    patch.birth = text('born') ? parseDate(text('born'), { dateLocale }) : undefined;
  if (changed('died'))
    patch.death = text('died') ? parseDate(text('died'), { dateLocale }) : undefined;
  if (changed('age')) patch.age = text('age') ? parseAge(text('age')) : undefined;
  if (changed('relationship')) patch.relationshipText = text('relationship') || undefined;
  return patch;
}

/**
 * Save a stone's transcription: inscription and epitaph as carved, and its people (created,
 * changed, or removed when emptied). Unchanged text writes nothing. Resolves to draft ids that
 * were replaced: a person removed and then typed again gets a new id, because a tombstone
 * always wins on merge (§21.2) and reusing the id would lose them again.
 */
export async function saveTranscription(
  store: Store,
  monumentId: ID,
  draft: TranscriptionDraft,
): Promise<Record<ID, ID>> {
  const renamed: Record<ID, ID> = {};
  await store.run('Transcribe', async () => {
    const m = await store.monuments.get(monumentId);
    if (!m) return;
    const cemetery = await store.cemeteries.get(m.cemeteryId);
    const dateLocale = cemetery?.settings.dateLocale ?? 'en-US';

    const inscription = carved(draft.inscription);
    const epitaph = carved(draft.epitaph);
    const patch: Parameters<typeof store.monuments.update>[1] = {};
    if ((m.inscription?.text ?? '') !== inscription) {
      const { text: _old, ...rest } = m.inscription ?? { text: '' };
      patch.inscription =
        inscription || Object.keys(rest).length ? { ...rest, text: inscription } : undefined;
    }
    if ((m.epitaph ?? '') !== epitaph) patch.epitaph = epitaph || undefined;
    if (Object.keys(patch).length) await store.monuments.update(monumentId, patch);

    for (const d of draft.people) {
      const existing = await store.persons.get(d.id, { includeDeleted: true });
      if (existing && !existing.deleted && existing.monumentId === monumentId) {
        if (isBlank(d)) await store.persons.delete(d.id);
        else {
          const p = personPatch(d, personDraft(existing), dateLocale);
          if (Object.keys(p).length) await store.persons.update(d.id, p);
        }
      } else if ((!existing || existing.deleted) && !isBlank(d)) {
        const id = existing ? store.newId() : d.id;
        if (id !== d.id) renamed[d.id] = id;
        await store.persons.create({
          id,
          cemeteryId: m.cemeteryId,
          monumentId,
          name: {},
          ...personPatch(d, undefined, dateLocale),
          sources: [{ kind: 'stone', note: 'transcribed from photo' }],
        });
      }
    }
  });
  return renamed;
}

/** Just the inscription (kept for callers that edit nothing else). */
export async function saveInscription(store: Store, id: ID, text: string): Promise<void> {
  const m = await store.monuments.get(id);
  if (!m) return;
  const people = (await store.persons.byMonument(id)).map(personDraft);
  await saveTranscription(store, id, { inscription: text, epitaph: m.epitaph ?? '', people });
}
