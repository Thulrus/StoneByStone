/** Desk-mode transcription writes (plan §9). Each save is one undo step. */
import {
  calculateBirth,
  deepEqual,
  DEFAULT_CONVENTION,
  parseAge,
  parseDate,
  parseName,
  type ID,
  type Inscription,
  type Military,
  type Monument,
  type Person,
} from '../domain';
import type { Store } from './store';

/** One person on the stone, as typed. `id` is made up front, so a re-save never duplicates. */
export interface PersonDraft {
  id: ID;
  name: string;
  born: string;
  died: string;
  age: string;
  relationship: string;
  /** Military service (plan §10.4). */
  conflict: string;
  rank: string;
  unit: string;
  marker: string;
}

export interface TranscriptionDraft {
  inscription: string;
  epitaph: string;
  people: PersonDraft[];
  /** Symbol ids or free text (plan §10.4). */
  symbols: string[];
  carver: string;
  /** BCP 47 / ISO 15924 codes, '' when not set. */
  language: string;
  script: string;
}

const MILITARY = ['conflict', 'rank', 'unit', 'marker'] as const;

/** As carved: line breaks and leading spaces kept, only trailing blank space dropped. */
const carved = (text: string) => text.replace(/\s+$/u, '');

/**
 * The inscription to store. A changed text records the cemetery's current convention
 * (plan §10.5); other fields keep the one it was written in.
 */
function inscriptionOf(
  was: Inscription | undefined,
  d: TranscriptionDraft,
  convention: string,
): Inscription | undefined {
  const text = carved(d.inscription);
  const language = d.language.trim();
  const script = d.script.trim();
  if (!text && !language && !script) return undefined;
  const sameText = (was?.text ?? '') === text;
  const out: Inscription = { ...was, text };
  if (language) out.language = language;
  else delete out.language;
  if (script) out.script = script;
  else delete out.script;
  if (!sameText || !out.convention) out.convention = convention;
  if (was && sameText && (was.language ?? '') === language && (was.script ?? '') === script) {
    return was;
  }
  return out;
}

export const emptyPerson = (id: ID): PersonDraft => ({
  id,
  name: '',
  born: '',
  died: '',
  age: '',
  relationship: '',
  conflict: '',
  rank: '',
  unit: '',
  marker: '',
});

export const personDraft = (p: Person): PersonDraft => ({
  id: p.id,
  name: p.name.asCarved ?? [p.name.given, p.name.surname].filter(Boolean).join(' '),
  // A birth calculated from the age shows as blank, so it's recalculated when those change.
  born: p.birth?.qualifier === 'calculated' && p.age ? '' : (p.birth?.original ?? ''),
  died: p.death?.original ?? '',
  age: p.age?.original ?? '',
  relationship: p.relationshipText ?? '',
  conflict: p.military?.conflict ?? '',
  rank: p.military?.rank ?? '',
  unit: p.military?.unit ?? '',
  marker: p.military?.marker ?? '',
});

/** The form's starting point for a stone and its people. */
export const transcriptionDraft = (
  m: Monument,
  people: readonly Person[],
  newId: () => ID,
): TranscriptionDraft => ({
  inscription: m.inscription?.text ?? '',
  epitaph: m.epitaph ?? '',
  people: people.length ? people.map(personDraft) : [emptyPerson(newId())],
  symbols: m.symbols ?? [],
  carver: m.carver ?? '',
  language: m.inscription?.language ?? '',
  script: m.inscription?.script ?? '',
});

export const isBlank = (d: PersonDraft): boolean =>
  !(d.name + d.born + d.died + d.age + d.relationship + MILITARY.map((k) => d[k]).join('')).trim();

/** Only the fields whose typed text changed, parsed (names, fuzzy dates, ages). */
function personPatch(d: PersonDraft, existing: Person | undefined, dateLocale: string) {
  const was = existing && personDraft(existing);
  const patch: Partial<Person> = {};
  const changed = (k: keyof PersonDraft) => !was || was[k].trim() !== d[k].trim();
  const text = (k: keyof PersonDraft) => d[k].trim();
  if (changed('name')) patch.name = text('name') ? parseName(text('name')) : {};
  const death = text('died') ? parseDate(text('died'), { dateLocale }) : undefined;
  const age = text('age') ? (parseAge(text('age')) ?? { original: text('age') }) : undefined;
  if (changed('died')) patch.death = death;
  if (changed('age')) patch.age = age;
  // Born left blank: calculated from the death date and age (plan §10.1).
  if (changed('born') || (!text('born') && (changed('died') || changed('age')))) {
    patch.birth = text('born')
      ? parseDate(text('born'), { dateLocale })
      : death && age
        ? calculateBirth(death, age)
        : undefined;
  }
  if (changed('relationship')) patch.relationshipText = text('relationship') || undefined;
  if (MILITARY.some(changed)) {
    const parts = [['notes', existing?.military?.notes], ...MILITARY.map((k) => [k, text(k)])];
    const military = Object.fromEntries(parts.filter(([, v]) => v)) as Military;
    patch.military = Object.keys(military).length ? military : undefined;
  }
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

    const convention = cemetery?.settings.transcriptionConvention ?? DEFAULT_CONVENTION;

    const patch: Parameters<typeof store.monuments.update>[1] = {};
    const inscription = inscriptionOf(m.inscription, draft, convention);
    if (!deepEqual(inscription, m.inscription)) patch.inscription = inscription;
    const epitaph = carved(draft.epitaph);
    if ((m.epitaph ?? '') !== epitaph) patch.epitaph = epitaph || undefined;
    const carver = draft.carver.trim();
    if ((m.carver ?? '') !== carver) patch.carver = carver || undefined;
    const symbols = draft.symbols.length ? draft.symbols : undefined;
    if (!deepEqual(symbols, m.symbols)) patch.symbols = symbols;
    if (Object.keys(patch).length) await store.monuments.update(monumentId, patch);

    for (const d of draft.people) {
      const existing = await store.persons.get(d.id, { includeDeleted: true });
      if (existing && !existing.deleted && existing.monumentId === monumentId) {
        if (isBlank(d)) await store.persons.delete(d.id);
        else {
          const p = personPatch(d, existing, dateLocale);
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
  const people = await store.persons.byMonument(id);
  await saveTranscription(store, id, {
    ...transcriptionDraft(m, people, () => store.newId()),
    inscription: text,
  });
}
