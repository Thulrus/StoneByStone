import { expect, test } from 'vitest';
import { parseName, type Person } from '../../domain';
import { linkCandidates } from './candidates';

const p = (id: string, name: string, monumentId: string, relationshipText?: string) =>
  ({ id, name: parseName(name), monumentId, relationshipText }) as Person;

test('same stone first, then carved names, then alphabetical; query filters', () => {
  const amos = p('a', 'Amos Brown', 's2', 'son of John & Mary Brown');
  const people = [
    amos,
    p('z', 'Zed Brown', 's2'),
    p('j', 'John Brown', 's1'),
    p('m', 'Mary Brown', 's1'),
    p('x', 'Ann Cole', 's3'),
  ];
  expect(linkCandidates(amos, people).map((c) => c.person.id)).toEqual(['z', 'j', 'm', 'x']);
  expect(linkCandidates(amos, people, 'mar').map((c) => c.person.id)).toEqual(['m']);
});
