// @vitest-environment node
import { expect, test } from 'vitest';
import { parseDate } from '../../domain';
import { i18n } from '../../i18n/i18n';
import { describeDate, readPerson } from './date-preview';

const read = (text: string, dateLocale = 'en-US') =>
  describeDate(i18n, parseDate(text, { dateLocale }));

// Every form listed in plan §10.1.
test.each([
  ['1887', '1887'],
  ['Mar 1887', 'March 1887'],
  ['March 1887', 'March 1887'],
  ['3/1887', 'March 1887'],
  ['abt 1887', 'about 1887'],
  ['about 1887', 'about 1887'],
  ['c. 1887', 'about 1887'],
  ['ca. 1887', 'about 1887'],
  ['circa 1887', 'about 1887'],
  ['bef 1890', 'before 1890'],
  ['aft 1890', 'after 1890'],
  ['bet 1880 and 1885', 'between 1880 and 1885'],
  ['1880–85', 'between 1880 and 1885'],
  ['Mar. 12th 1887', 'March 12, 1887'],
  ['ye 3d of May 1790', 'May 3, 1790'],
  ['12 Febry 1801', 'February 12, 1801'],
  ['Sept 3 1862', 'September 3, 1862'],
  ['Feb 10, 1709/10', 'February 10, 1710 · dual dated 1709/10, new-style year 1710'],
  ['1790 O.S.', '1790 · Julian (old style)'],
])('%s reads as %s', (typed, shown) => {
  const r = read(typed);
  expect(r.text).toBe(shown);
  expect(r.warning).toBeUndefined();
});

test('inst. and ult. are kept as typed, with a note', () => {
  for (const typed of ['12th inst.', '3d ult.']) {
    const r = read(typed);
    expect(r.text).toBe('Kept as typed.');
    expect(r.warning).toMatch(/this month/);
  }
});

test('numeric ambiguity is flagged with the other reading, by the cemetery locale', () => {
  expect(read('3/4/1890')).toEqual({
    text: 'March 4, 1890',
    warning: expect.stringContaining('(April 3, 1890)') as string,
  });
  expect(read('3/4/1890', 'en-GB').text).toBe('April 3, 1890');
  expect(read('13/4/1890').warning).toBeUndefined();
});

test('old-style Quaker months warn about the year', () => {
  expect(read('11th day 12th mo. 1740').warning).toMatch(/year began in March/);
});

test('Hebrew dates and unreadable text are kept as typed', () => {
  expect(read('ה׳ תשרי תרנ״ה').text).toMatch(/Hebrew date/);
  expect(read('gone').text).toMatch(/Not read as a date/);
});

test('age at death, and a birth calculated from it when Born is blank', () => {
  const r = readPerson(i18n, { born: '', died: 'Mar 10, 1887', age: 'aged 72y 3m 5d' }, 'en-US');
  expect(r.age?.text).toBe('age 72 years, 3 months, 5 days');
  expect(r.born?.text).toBe('Calculated from the age: December 5, 1814');
  for (const age of ['Æ 72', 'AE. 72 yrs']) {
    expect(readPerson(i18n, { born: '', died: '1887', age }, 'en-US')).toMatchObject({
      age: { text: 'age 72 years' },
      born: { text: 'Calculated from the age: 1815' },
    });
  }
  expect(readPerson(i18n, { born: '', died: '', age: 'in his 73rd year' }, 'en-US').age?.text).toBe(
    'age 72 years ("in the Nth year" is one less)',
  );
  // A typed birth wins over the calculation.
  expect(readPerson(i18n, { born: '1814', died: '1887', age: '72' }, 'en-US').born?.text).toBe(
    '1814',
  );
});
