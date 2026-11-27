import { expect, test } from 'vitest';
import {
  indexLocation,
  LIKELY_MATCH,
  nameScore,
  rankStones,
  scoreStone,
  yearScore,
  type StoneContext,
} from './index-match';
import type { FuzzyDate, Monument, Person, PersonName } from './types';

let n = 0;
const year = (y: number): FuzzyDate => ({ original: String(y), y });
const person = (name: PersonName, over: Partial<Person> = {}): Person =>
  ({ id: `p${++n}`, name, ...over }) as Person;
const record = (name: PersonName, over: Partial<Person> = {}, location?: object) =>
  person(name, {
    matchStatus: 'unmatched',
    sources: [{ kind: 'imported-index', ref: 'x.csv, line 2', ...(location ? { location } : {}) }],
    ...over,
  });
const stone = (over: Partial<Monument> = {}): Monument =>
  ({ id: `m${++n}`, status: 'transcribed', ...over }) as Monument;
const ctx = (s: Monument, people: Person[] = [], section?: string, row?: string): StoneContext => ({
  stone: s,
  people,
  section,
  row,
});

test('names: exact, sound-alike, abbreviated given name, unrelated', () => {
  expect(nameScore({ given: 'John', surname: 'Smith' }, { given: 'JOHN', surname: 'SMITH' })).toBe(
    1,
  );
  expect(nameScore({ given: 'Wm.', surname: 'Peck' }, { given: 'William', surname: 'Peck' })).toBe(
    1,
  );
  expect(
    nameScore({ given: 'John', surname: 'Smyth' }, { given: 'John', surname: 'Smith' }),
  ).toBeCloseTo(0.82);
  expect(
    nameScore({ given: 'J.', surname: 'Smith' }, { given: 'John', surname: 'Smith' }),
  ).toBeCloseTo(0.84);
  expect(
    nameScore(
      { given: 'Mary', surname: 'Peck' },
      { given: 'Mary', surname: 'Smith', birthSurname: 'Peck' },
    ),
  ).toBe(1);
  expect(nameScore({ given: 'John', surname: 'Smith' }, { given: 'Ruth', surname: 'Jones' })).toBe(
    0,
  );
});

test('years: same, a year apart (old style / new style), conflict', () => {
  expect(yearScore(year(1890), year(1890))).toBe(1);
  expect(yearScore({ original: '', y: 1710, dualYear: 1709 }, year(1709))).toBe(1);
  expect(yearScore(year(1890), year(1891))).toBe(0.6);
  expect(yearScore(year(1890), year(1920))).toBe(-1);
  expect(yearScore(undefined, year(1890))).toBeUndefined();
});

test('the transcribed person with the same name and death year ranks first', () => {
  const r = record(
    { given: 'John', surname: 'Smith' },
    { death: year(1890) },
    { section: 'A', row: '3' },
  );
  const john = person({ given: 'John', surname: 'Smith' }, { death: year(1890) });
  const otherJohn = person({ given: 'John', surname: 'Smith' }, { death: year(1951) });
  const mary = person({ given: 'Mary', surname: 'Smith' }, { death: year(1890) });
  const a = stone({ address: { rowIndex: 0 } });
  const b = stone();
  const c = stone();
  const ranked = rankStones(r, [ctx(c, [mary]), ctx(b, [otherJohn]), ctx(a, [john], 'A', '3')]);
  expect(ranked[0]?.stone.id).toBe(a.id);
  expect(ranked[0]?.person?.id).toBe(john.id);
  expect(ranked[0]?.reasons).toEqual({ name: 1, date: 1, place: 1 });
  expect(ranked[0]?.score).toBe(1);
  // The 1951 John Smith is a date conflict: not offered.
  expect(ranked.map((x) => x.stone.id)).not.toContain(b.id);
});

test('an untranscribed stone can match by the words of its inscription and its place', () => {
  const r = record(
    { given: 'Johann', surname: 'Schmidt' },
    {},
    { section: 'B', row: '7', plot: '1' },
  );
  const s = stone({
    status: 'photographed',
    address: { rowIndex: 0 },
    inscription: { text: 'HIER RUHT\nJOHANN SCHMIDT' },
  });
  const c = scoreStone(r, ctx(s, [], 'B', '7'));
  expect(c.person).toBeUndefined();
  expect(c.reasons.name).toBe(0.9);
  expect(c.reasons.place).toBe(1);
  expect(c.score).toBeGreaterThan(LIKELY_MATCH);
});

test('place alone never makes a match', () => {
  const r = record({ given: 'Ann', surname: 'Snow' }, {}, { section: 'A', row: '1' });
  const c = scoreStone(r, ctx(stone(), [person({ given: 'Ruth', surname: 'Jones' })], 'A', '1'));
  expect(c.score).toBeLessThan(LIKELY_MATCH);
  expect(rankStones(r, [ctx(stone(), [], 'A', '1')])).toEqual([]);
});

test('index location is read from the imported-index source', () => {
  expect(indexLocation(record({}, {}, { plot: '12' }))).toEqual({ plot: '12' });
  expect(indexLocation(person({}))).toBeUndefined();
});
