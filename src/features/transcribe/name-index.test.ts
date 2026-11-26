// @vitest-environment node
import { expect, test } from 'vitest';
import { parseName, type Person } from '../../domain';
import { buildNameIndex, suggestNames } from './name-index';

const people = (...names: string[]) =>
  names.map((n) => ({ name: parseName(n) }) as Pick<Person, 'name' | 'deleted'>);

test('whole names match on the start of every typed word, most used first', () => {
  const index = buildNameIndex(
    people('Mary A. Brown', 'Mary Brown', 'Mary Brown', 'John Brown', 'Marietta Hale'),
  );
  expect(suggestNames(index, 'mar br')).toEqual(['Mary Brown', 'Mary A. Brown']);
  expect(suggestNames(index, 'Mar')).toEqual(['Mary Brown', 'Marietta Hale', 'Mary A. Brown']);
  expect(suggestNames(index, 'Mary Brown')).toEqual(['Mary A. Brown']);
  expect(suggestNames(index, '')).toEqual([]);
});

test('carved abbreviations and accents match both ways', () => {
  const index = buildNameIndex(people('Wm. Hart', 'William Hale', 'Zoë Lamb'));
  expect(suggestNames(index, 'william h')).toEqual(['William Hale', 'Wm. Hart']);
  expect(suggestNames(index, 'wm')).toEqual(['William Hale', 'Wm. Hart']);
  expect(suggestNames(index, 'zoe')).toEqual(['Zoë Lamb']);
});

test('the last word completes to a known surname', () => {
  const index = buildNameIndex(people('Asa Whitcomb', 'Lucy Whitcomb', 'Eli Hart'));
  expect(suggestNames(index, 'Sarah Whit')).toEqual(['Sarah Whitcomb']);
  expect(suggestNames(index, 'Sarah W')).toEqual([]);
});

test('deleted people are left out', () => {
  const [p] = people('Gone Away');
  expect(suggestNames(buildNameIndex([{ ...p!, deleted: { hlc: '1', by: 'x' } }]), 'gone')).toEqual(
    [],
  );
});

test('a lookup over 20 000 names takes under 50 ms', () => {
  const given = ['John', 'Mary', 'Wm.', 'Sarah', 'Eliza', 'Thos.', 'Hannah', 'Asa', 'Lucy', 'Eli'];
  const names = Array.from(
    { length: 20_000 },
    (_, i) => `${given[i % 10]} ${String.fromCharCode(65 + (i % 26))}surname${i % 3000}`,
  );
  const index = buildNameIndex(people(...names));
  const times: number[] = [];
  for (const q of ['m', 'mary b', 'wil', 'zz', 'eli k', 'thomas', 'jo', 'h']) {
    const t0 = performance.now();
    suggestNames(index, q);
    times.push(performance.now() - t0);
  }
  expect(Math.max(...times)).toBeLessThan(50);
});
