/**
 * Relationships (plan §10.3): the carved phrase is kept verbatim on the person; structured
 * links sit alongside it. `{ type, personId }` on a person reads "personId is my <type>", and
 * every link is stored on both people, each with its own side (`inverseRelation`).
 */
import { expandGivenNames } from './names/abbreviations';
import { parseName } from './names/parse';
import { soundex } from './names/phonetic';
import type { Person, PersonRelationType } from './types';

export function inverseRelation(type: PersonRelationType): PersonRelationType {
  switch (type) {
    case 'parent':
      return 'child';
    case 'child':
      return 'parent';
    default:
      return type;
  }
}

const PHRASES: readonly [RegExp, PersonRelationType][] = [
  [/\b(wife|husband|consort|relict|widow|widower|spouse)\b/iu, 'spouse'],
  [/\b(son|dau|daughter|child|infant|babe)\b/iu, 'parent'],
  [/\b(father|mother|parent)\b/iu, 'child'],
  [/\b(brother|sister|sibling)\b/iu, 'sibling'],
];

export interface CarvedRelation {
  /** What the people named are to this person. */
  type?: PersonRelationType;
  /** Names after "of", split on "&" / "and"; a shared surname is carried to each. */
  names: string[];
}

/**
 * Read a carved phrase: "wife of John Brown" → spouse, [John Brown]; "son of John & Mary
 * Smith" → parent, [John Smith, Mary Smith]. "His wife" and the like name nobody.
 */
export function parseCarvedRelation(text: string, ownSurname?: string): CarvedRelation {
  const type = PHRASES.find(([re]) => re.test(text))?.[1];
  const of = /\bof\s+(.+)$/iu.exec(text.trim());
  if (!of?.[1]) return { ...(type ? { type } : {}), names: [] };
  const parts = of[1]
    .replace(/[.,;]+$/u, '')
    .split(/\s*(?:&|\band\b)\s*/iu)
    .map((s) => s.trim())
    .filter(Boolean);
  const last = parts.length > 1 ? parseName(parts[parts.length - 1] ?? '').surname : undefined;
  const names = parts.map((p) => {
    const n = parseName(p);
    const surname = n.surname && n.given ? undefined : (last ?? ownSurname);
    return surname && !p.includes(' ') ? `${p} ${surname}` : p;
  });
  return { ...(type ? { type } : {}), names };
}

/** How well a person matches a name from a carved phrase: 0 (no) to 1 (exact). */
export function nameMatch(person: Pick<Person, 'name'>, wanted: string): number {
  const w = parseName(wanted);
  const n = person.name;
  const given = (s?: string) =>
    expandGivenNames(s ?? '')
      .toLowerCase()
      .split(/\s+/u)[0] ?? '';
  const sameGiven = !!w.given && given(w.given) === given(n.given);
  const sameSurname = !!w.surname && !!n.surname && soundex(w.surname) === soundex(n.surname);
  if (sameGiven && sameSurname) return 1;
  if (sameGiven && !w.surname) return 0.6;
  if (sameSurname && !w.given) return 0.5;
  if (sameSurname || sameGiven) return 0.3;
  return 0;
}
