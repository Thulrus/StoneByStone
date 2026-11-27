import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { parseCsv } from './csv';
import { guessMapping, indexRowsToPeople, mappingFromPreset, presetFromMapping } from './index-csv';

const text = readFileSync(resolve('tests/fixtures/index/burial-index.csv'), 'utf8');

test('a historical-society export: headers guessed, every named row becomes a person', () => {
  const [headers = [], ...rows] = parseCsv(text);
  const mapping = guessMapping(headers);
  expect(mapping).toEqual([
    'ref', 'surname', 'given', 'birthSurname', 'birth', 'death', 'age',
    'section', 'plot', 'ignore', 'military', 'notes',
  ]); // prettier-ignore

  const { people, skipped } = indexRowsToPeople(rows, mapping, {
    cemeteryId: 'c1',
    fileName: 'burial-index.csv',
    dateLocale: 'en-US',
    firstLine: 2,
  });
  expect(skipped).toEqual([6]);
  expect(people).toHaveLength(5);

  const [john, mary, johann, wm, infant] = people;
  expect(john?.name).toEqual({ surname: 'SMITH', given: 'John Henry' });
  expect(john?.birth).toMatchObject({ y: 1820, m: 3, d: 4 });
  expect(john?.death).toMatchObject({ y: 1890, m: 2, d: 10 });
  expect(john?.military).toEqual({ conflict: 'Civil War, 2nd VT Inf.' });
  expect(john?.notes).toBe('Stone broken');
  expect(john?.matchStatus).toBe('unmatched');
  expect(john?.monumentId).toBeUndefined();
  expect(john?.sources).toEqual([
    { kind: 'imported-index', ref: 'burial-index.csv, 1', location: { section: 'A', plot: '12' } },
  ]);

  expect(mary?.name.birthSurname).toBe('Peck');
  expect(mary?.birth).toMatchObject({ y: 1825, qualifier: 'about' });
  expect(mary?.death).toMatchObject({ y: 1899, m: 12, d: 3 });
  expect(mary?.notes).toBe('wife of John H.; "Mother"');

  // Age with no birth date gives a calculated birth, as in desk mode.
  expect(johann?.age).toMatchObject({ y: 72, m: 3, d: 2 });
  expect(johann?.birth).toMatchObject({ y: 1779, m: 3, d: 3, qualifier: 'calculated' });

  expect(wm?.name).toEqual({ surname: 'Ölander', given: 'Wm.' });
  expect(wm?.sources?.[0]?.location).toEqual({ section: 'B' });
  expect(infant?.name.given).toBe('Infant son');
});

test('day-first sources read 12/3/1899 as 12 March', () => {
  const [headers = [], ...rows] = parseCsv(text);
  const { people } = indexRowsToPeople(rows, guessMapping(headers), {
    cemeteryId: 'c1',
    fileName: 'x.csv',
    dateLocale: 'en-GB',
    firstLine: 2,
  });
  expect(people[1]?.death).toMatchObject({ y: 1899, m: 3, d: 12 });
});

test('a full-name column is parsed; separate columns override its parts', () => {
  const { people } = indexRowsToPeople(
    [
      ['Smith, John Wm., Jr.', 'M', ''],
      ['Mrs. Mary (Peck) Smith', 'F', 'Smyth'],
    ],
    ['fullName', 'sex', 'surname'],
    { cemeteryId: 'c1', fileName: 'x.csv', dateLocale: 'en-US', firstLine: 1 },
  );
  expect(people[0]?.name).toMatchObject({
    given: 'John',
    middle: 'Wm.',
    surname: 'Smith',
    suffix: 'Jr.',
  });
  expect(people[0]?.name.asCarved).toBeUndefined();
  expect(people[0]?.sex).toBe('m');
  expect(people[1]?.name).toMatchObject({
    prefix: 'Mrs.',
    given: 'Mary',
    birthSurname: 'Peck',
    surname: 'Smyth',
  });
  expect(people[1]?.sources?.[0]?.ref).toBe('x.csv, line 2');
});

test('a preset maps the same export again, even with columns moved', () => {
  const headers = ['Last Name', 'First Name', 'Lot #', 'Died'];
  const mapping = guessMapping(headers);
  mapping[2] = 'row';
  const preset = presetFromMapping('County society', headers, mapping, true, 'en-GB');
  expect(mappingFromPreset(preset, ['Died', 'Extra', 'LAST NAME', 'First name', 'Lot #'])).toEqual([
    'death', 'ignore', 'surname', 'given', 'row',
  ]); // prettier-ignore
});
