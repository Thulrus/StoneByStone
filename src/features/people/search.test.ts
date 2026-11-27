import { expect, test } from 'vitest';
import type { Monument, Person, PersonName, Row, Stamp } from '../../domain';
import { buildPeopleIndex, compareByName, soundKeys, wordsOf } from './search';

let n = 0;
const person = (name: PersonName, over: Partial<Person> = {}): Person =>
  ({ id: `p${String(++n).padStart(3, '0')}`, name, ...over }) as Person;
const stone = (over: Partial<Monument> = {}): Monument =>
  ({ id: `m${String(++n).padStart(3, '0')}`, status: 'transcribed', ...over }) as Monument;
const rows = [{ id: 'r1', sectionId: 'secA' }, { id: 'r2' }] as Row[];

const names = (hits: { person: Person }[]) =>
  hits.map((h) => [h.person.name.given, h.person.name.surname].filter(Boolean).join(' '));

test('Schmidt, Smith and Smyth cluster together, exact spelling first', () => {
  const people = [
    person({ given: 'Johann', surname: 'Schmidt' }),
    person({ given: 'John', surname: 'Smith' }),
    person({ given: 'Mary', surname: 'Smyth' }),
    person({ given: 'Ann', surname: 'Snow' }),
    person({ given: 'Ruth', surname: 'Jones' }),
  ];
  const index = buildPeopleIndex(people, [], rows);
  for (const q of ['Smith', 'smyth', 'SCHMIDT']) {
    const found = names(index.search(q));
    expect(found).toHaveLength(3);
    expect(new Set(found)).toEqual(new Set(['Johann Schmidt', 'John Smith', 'Mary Smyth']));
  }
  expect(names(index.search('Smith'))[0]).toBe('John Smith');
  expect(names(index.search('Schmidt'))[0]).toBe('Johann Schmidt');
});

test('sound keys: Soundex and Daitch–Mokotoff', () => {
  expect(soundKeys('smith')).toEqual(expect.arrayContaining(['ss530', 'd463000']));
  expect(soundKeys('schmidt')).toEqual(expect.arrayContaining(['ss530', 'd463000']));
  expect(soundKeys('x')).toEqual([]);
});

test('abbreviations, accents, punctuation and prefixes', () => {
  const people = [
    person({ asCarved: 'Wm. H. Ölander', given: 'Wm. H.', surname: 'Ölander' }),
    person({ given: 'William', surname: "O'Brien" }),
    person({ given: 'Chas.', surname: 'Peck' }),
    person({ given: 'Zoë', surname: 'Martin-Lee' }),
  ];
  const index = buildPeopleIndex(people, [], rows);
  expect(names(index.search('william'))).toEqual(
    expect.arrayContaining(['Wm. H. Ölander', "William O'Brien"]),
  );
  expect(names(index.search('wm obrien'))).toEqual(["William O'Brien"]);
  expect(names(index.search('olander'))).toEqual(['Wm. H. Ölander']);
  expect(names(index.search('charles'))).toEqual(['Chas. Peck']);
  expect(names(index.search('zoe lee'))).toEqual(['Zoë Martin-Lee']);
  expect(names(index.search('pec'))).toEqual(['Chas. Peck']);
});

test('every word must match; inscriptions and notes are searched too', () => {
  const m = stone({ inscription: { text: 'IN MEMORY OF\nA BELOVED BLACKSMITH' } });
  const people = [
    person({ given: 'John', surname: 'Smith' }, { monumentId: m.id }),
    person({ given: 'John', surname: 'Brown' }, { notes: 'Moved from Elm Street' }),
  ];
  const index = buildPeopleIndex(people, [m], rows);
  expect(names(index.search('john smith'))).toEqual(['John Smith']);
  expect(names(index.search('blacksmith'))).toEqual(['John Smith']);
  expect(names(index.search('elm'))).toEqual(['John Brown']);
  expect(index.search('john zebra')).toEqual([]);
});

test('filters: date, section, status, symbol, material, veteran', () => {
  const inA = stone({
    address: { rowId: 'r1' },
    symbols: ['willow-urn'],
    material: 'marble',
    status: 'verified',
  });
  const loose = stone({ address: { rowId: 'r2' }, material: 'slate' });
  const marker = stone({ address: { rowId: 'r2' }, flags: ['veteran-marker'] });
  const people = [
    person(
      { given: 'A', surname: 'One' },
      { monumentId: inA.id, death: { original: '', y: 1850 } },
    ),
    person(
      { given: 'B', surname: 'Two' },
      { monumentId: loose.id, birth: { original: '', y: 1790 } },
    ),
    person({ given: 'C', surname: 'Three' }, { military: { conflict: 'Civil War' } }),
    person({ given: 'D', surname: 'Four' }, { monumentId: marker.id }),
    person({ given: 'E', surname: 'Gone' }, { deleted: {} as Stamp }),
  ];
  const index = buildPeopleIndex(people, [inA, loose, marker], rows);
  expect(index.size).toBe(4);
  expect(names(index.search('', {}))).toEqual(['D Four', 'A One', 'C Three', 'B Two']);
  expect(names(index.search('', { from: 1800 }))).toEqual(['A One']);
  expect(names(index.search('', { to: 1800 }))).toEqual(['B Two']);
  expect(names(index.search('', { section: 'secA' }))).toEqual(['A One']);
  expect(names(index.search('', { section: 'none' }))).toEqual(['D Four', 'B Two']);
  expect(names(index.search('', { status: 'verified' }))).toEqual(['A One']);
  expect(names(index.search('', { status: 'no-stone' }))).toEqual(['C Three']);
  expect(names(index.search('', { symbol: 'willow-urn' }))).toEqual(['A One']);
  expect(names(index.search('', { material: 'slate' }))).toEqual(['B Two']);
  expect(names(index.search('', { veteran: true }))).toEqual(['D Four', 'C Three']);
  expect(names(index.search('one', { veteran: true }))).toEqual([]);
});

test('name order is collated: accents and case sort with their letters', () => {
  const people = ['Zane', 'Ångström', 'adams', 'Émile', 'Bell'].map((s) => person({ surname: s }));
  expect([...people].sort(compareByName).map((p) => p.name.surname)).toEqual([
    'adams',
    'Ångström',
    'Bell',
    'Émile',
    'Zane',
  ]);
});

test('words: folded, hyphen parts kept, punctuation dropped', () => {
  expect(wordsOf("Wm. O'Brien, Martin-Lee (Zoë)")).toEqual([
    'wm',
    'obrien',
    'martin-lee',
    'martin',
    'lee',
    'zoe',
  ]);
});

test('10,000 people: search answers in well under a frame budget', () => {
  const surnames = ['Smith', 'Jones', 'Whitcomb', 'Schmidt', 'Peck', 'Brown', 'Ølander'];
  const people = Array.from({ length: 10_000 }, (_, i) =>
    person({ given: `Given${i % 300}`, surname: `${surnames[i % surnames.length]}${i % 50}` }),
  );
  const index = buildPeopleIndex(people, [], rows);
  const times: number[] = [];
  for (let i = 0; i < 9; i++) {
    const t0 = performance.now();
    index.search('given12 smith');
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  expect(times[4]).toBeLessThan(50);
});
