/** Who a person's carved relationship most likely points at (plan §10.3), pure. */
import { nameMatch, parseCarvedRelation, type ID, type Person } from '../../domain';

export interface Candidate {
  person: Person;
  score: number;
}

/**
 * Everyone else in the cemetery, best first: people on the same stone (couples, families),
 * then those whose names match the names carved after "of", then by name. `query` filters by
 * name, ignoring case.
 */
export function linkCandidates(self: Person, people: readonly Person[], query = ''): Candidate[] {
  const { names } = parseCarvedRelation(self.relationshipText ?? '', self.name.surname);
  const q = query.trim().toLowerCase();
  const label = (p: Person) =>
    (p.name.asCarved ?? [p.name.given, p.name.surname].filter(Boolean).join(' ')).toLowerCase();
  return people
    .filter((p) => p.id !== self.id && !p.deleted)
    .filter((p) => !q || label(p).includes(q))
    .map((person) => {
      const byName = Math.max(0, ...names.map((n) => nameMatch(person, n)));
      const sameStone = !!self.monumentId && person.monumentId === self.monumentId;
      return { person, score: (sameStone ? 2 : 0) + byName };
    })
    .sort((a, b) => b.score - a.score || label(a.person).localeCompare(label(b.person)));
}

export const linkedIds = (p: Person): Set<ID> =>
  new Set((p.relations ?? []).map((r) => r.personId));

export const personLabel = (p: Pick<Person, 'name'>): string =>
  p.name.asCarved || [p.name.given, p.name.surname].filter(Boolean).join(' ');
