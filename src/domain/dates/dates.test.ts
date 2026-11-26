import { describe, expect, it } from 'vitest';
import type { FuzzyDate } from '../types';
import { calculateBirth, parseAge } from './age';
import { formatDate } from './format';
import { numericDateOrder, parseDate } from './parse';

type Parts = Omit<FuzzyDate, 'original'>;
const D = (y?: number, m?: number, d?: number, extra: Parts = {}): Parts => {
  const p: Parts = {};
  if (y !== undefined) p.y = y;
  if (m !== undefined) p.m = m;
  if (d !== undefined) p.d = d;
  return { ...p, ...extra };
};
const about = { qualifier: 'about' } as const;
const before = { qualifier: 'before' } as const;
const after = { qualifier: 'after' } as const;
const calc = { qualifier: 'calculated' } as const;
const est = { qualifier: 'estimated' } as const;
const amb = { ambiguous: true } as const;
const bet = (y2?: number, m2?: number, d2?: number): Parts => {
  const p: Parts = { qualifier: 'between' };
  if (y2 !== undefined) p.y2 = y2;
  if (m2 !== undefined) p.m2 = m2;
  if (d2 !== undefined) p.d2 = d2;
  return p;
};
const dual = (old: number): Parts => ({ dualYear: old, calendar: 'julian' });
const julian = { calendar: 'julian' } as const;
const NONE: Parts = {};

/** Real-world forms from stones, transcriptions, indexes and notices (US English locale). */
const CASES: [string, Parts][] = [
  // --- years and partial dates
  ['1887', D(1887)],
  ['  1887 ', D(1887)],
  ['1887.', D(1887)],
  ['1700', D(1700)],
  ['2003', D(2003)],
  ['Mar 1887', D(1887, 3)],
  ['March 1887', D(1887, 3)],
  ['MARCH 1887', D(1887, 3)],
  ['Mar. 1887', D(1887, 3)],
  ['March, 1887', D(1887, 3)],
  ['3/1887', D(1887, 3)],
  ['03/1887', D(1887, 3)],
  ['12-1887', D(1887, 12)],
  ['Sept 1862', D(1862, 9)],
  ['Sept. 1862', D(1862, 9)],
  ['Septr 1776', D(1776, 9)],
  ['Feby 1801', D(1801, 2)],
  ['Febry 1801', D(1801, 2)],
  ['Jany 1799', D(1799, 1)],
  ['Augt 1812', D(1812, 8)],
  ['Octr 1790', D(1790, 10)],
  ['Novr 1790', D(1790, 11)],
  ['Decr 1790', D(1790, 12)],
  ['Decem 1790', D(1790, 12)],
  ['7ber 1755', D(1755, 9)],
  ['8ber 1755', D(1755, 10)],
  ['9br 1755', D(1755, 11)],
  ['10ber 1755', D(1755, 12)],
  ['Xber 1755', D(1755, 12)],
  ['10 Mar', D(undefined, 3, 10)],
  ['March 10', D(undefined, 3, 10)],
  ['June', D(undefined, 6)],
  // --- full dates, English word forms
  ['10 Mar 1887', D(1887, 3, 10)],
  ['10 March 1887', D(1887, 3, 10)],
  ['10th March 1887', D(1887, 3, 10)],
  ['10th of March 1887', D(1887, 3, 10)],
  ['March 10, 1887', D(1887, 3, 10)],
  ['March 10 1887', D(1887, 3, 10)],
  ['Mar. 10, 1887', D(1887, 3, 10)],
  ['Mar 10th, 1887', D(1887, 3, 10)],
  ['MAR. 10, 1887', D(1887, 3, 10)],
  ['mar 10 1887', D(1887, 3, 10)],
  ['Mar.10,1887', D(1887, 3, 10)],
  ['10Mar1887', D(1887, 3, 10)],
  ['1887 Mar 10', D(1887, 3, 10)],
  ['1887, March 10', D(1887, 3, 10)],
  ['Jan 1, 1900', D(1900, 1, 1)],
  ['Jan. 1st, 1900', D(1900, 1, 1)],
  ['January 1st 1900', D(1900, 1, 1)],
  ['Feb 2nd 1850', D(1850, 2, 2)],
  ['Feb 2d 1850', D(1850, 2, 2)],
  ['Feb. 22d, 1850', D(1850, 2, 22)],
  ['Feb 23rd 1850', D(1850, 2, 23)],
  ['Feb 23d 1850', D(1850, 2, 23)],
  ['April 3d 1777', D(1777, 4, 3)],
  ['Apl 3 1777', D(1777, 4, 3)],
  ['Aprl 3 1777', D(1777, 4, 3)],
  ['Augst 15 1840', D(1840, 8, 15)],
  ['Jly 4 1826', D(1826, 7, 4)],
  ['July 4th, 1826', D(1826, 7, 4)],
  ['Jne 9 1830', D(1830, 6, 9)],
  ['Mch 9 1830', D(1830, 3, 9)],
  ['31 Dec 1899', D(1899, 12, 31)],
  ['Dec. 31st, 1899', D(1899, 12, 31)],
  ['Oct 21 1805', D(1805, 10, 21)],
  ['Nov. 30th 1864', D(1864, 11, 30)],
  ['Sept 17 1862', D(1862, 9, 17)],
  ['Sep 17, 1862', D(1862, 9, 17)],
  ['September 17th, 1862', D(1862, 9, 17)],
  ['May 5 1919', D(1919, 5, 5)],
  ['5 May 1919', D(1919, 5, 5)],
  ['Feb 29 1860', D(1860, 2, 29)],
  ['Feb 30 1850', D(1850, 2, 30)], // carved as is
  // --- archaic and wordy forms
  ['ye 3d of May 1790', D(1790, 5, 3)],
  ['the 3d of May 1790', D(1790, 5, 3)],
  ['May ye 3d 1790', D(1790, 5, 3)],
  ['May y^e 3d 1790', D(1790, 5, 3)],
  ['the 3d day of May 1790', D(1790, 5, 3)],
  ['the 3d day of May in the year 1790', D(1790, 5, 3)],
  ['the 3d day of May A.D. 1790', D(1790, 5, 3)],
  ['the 3d of May in the year of our Lord 1790', D(1790, 5, 3)],
  ['May 3d Anno Domini 1790', D(1790, 5, 3)],
  ['May 3 AD 1790', D(1790, 5, 3)],
  ['A.D. 1790', D(1790)],
  ['Anno 1790', D(1790)],
  ['the first day of June 1801', D(1801, 6, 1)],
  ['the twenty-first of June 1801', D(1801, 6, 21)],
  ['the twenty first of June 1801', D(1801, 6, 21)],
  ['the thirtieth of June 1801', D(1801, 6, 30)],
  ['the thirty-first of July 1801', D(1801, 7, 31)],
  ['the tenth of Octr 1777', D(1777, 10, 10)],
  ['Sabbath, March 3, 1850', D(1850, 3, 3)],
  ['Sunday, March 3, 1850', D(1850, 3, 3)],
  ['Septr ye 9th 1776', D(1776, 9, 9)],
  ['Febry ye 10th 1745/6', D(1746, 2, 10, dual(1745))],
  ['ye 2d of Jany 1739/40', D(1740, 1, 2, dual(1739))],
  ['Octr ye 1st 1799', D(1799, 10, 1)],
  // --- event words before the date
  ['Died Mar 3, 1887', D(1887, 3, 3)],
  ['died March 3 1887', D(1887, 3, 3)],
  ['d. 1887', D(1887)],
  ['d 1887', D(1887)],
  ['D. Mar. 3, 1887', D(1887, 3, 3)],
  ['b. 1820', D(1820)],
  ['Born Dec. 25, 1820', D(1820, 12, 25)],
  ['BORN DEC 25 1820', D(1820, 12, 25)],
  ['Departed this life Augt 4th 1799', D(1799, 8, 4)],
  ['who departed this life Augt 4th 1799', D(1799, 8, 4)],
  ['Dec’d Jan 3 1801', D(1801, 1, 3)],
  ["Dec'd Jan 3 1801", D(1801, 1, 3)],
  ['Decd Jan 3 1801', D(1801, 1, 3)],
  ['Ob. 1790', D(1790)],
  ["Ob't Oct 3 1790", D(1790, 10, 3)],
  ['Obit 1790', D(1790)],
  ['Obiit 3 Oct 1790', D(1790, 10, 3)],
  ['Nat. 1710', D(1710)],
  ['bur. 4 Jan 1888', D(1888, 1, 4)],
  ['Buried Jan 4 1888', D(1888, 1, 4)],
  ['bapt. 12 Feb 1760', D(1760, 2, 12)],
  ['Died on March 3, 1887', D(1887, 3, 3)],
  ['Fell asleep June 2 1902', D(1902, 6, 2)],
  ['Entered into rest June 2 1902', D(1902, 6, 2)],
  ['Died: 1887', D(1887)],
  // --- qualifiers
  ['abt 1887', D(1887, undefined, undefined, about)],
  ['abt. 1887', D(1887, undefined, undefined, about)],
  ['ABT 1887', D(1887, undefined, undefined, about)],
  ['about 1887', D(1887, undefined, undefined, about)],
  ['About March 1887', D(1887, 3, undefined, about)],
  ['c. 1887', D(1887, undefined, undefined, about)],
  ['c.1887', D(1887, undefined, undefined, about)],
  ['c1887', D(1887, undefined, undefined, about)],
  ['ca. 1887', D(1887, undefined, undefined, about)],
  ['ca 1887', D(1887, undefined, undefined, about)],
  ['circa 1887', D(1887, undefined, undefined, about)],
  ['Circa 1887', D(1887, undefined, undefined, about)],
  ['approx. 1887', D(1887, undefined, undefined, about)],
  ['approximately 1887', D(1887, undefined, undefined, about)],
  ['~1887', D(1887, undefined, undefined, about)],
  ['~ 1887', D(1887, undefined, undefined, about)],
  ['1887?', D(1887, undefined, undefined, about)],
  ['1887 ?', D(1887, undefined, undefined, about)],
  ['1887(?)', D(1887, undefined, undefined, about)],
  ['Mar 10 1887?', D(1887, 3, 10, about)],
  ['bef 1887', D(1887, undefined, undefined, before)],
  ['bef. 1887', D(1887, undefined, undefined, before)],
  ['before 1887', D(1887, undefined, undefined, before)],
  ['Before Mar 1887', D(1887, 3, undefined, before)],
  ['ante 1700', D(1700, undefined, undefined, before)],
  ['aft 1887', D(1887, undefined, undefined, after)],
  ['aft. 1887', D(1887, undefined, undefined, after)],
  ['after 1887', D(1887, undefined, undefined, after)],
  ['After 10 Jun 1887', D(1887, 6, 10, after)],
  ['post 1700', D(1700, undefined, undefined, after)],
  ['cal 1818', D(1818, undefined, undefined, calc)],
  ['calc. 1818', D(1818, undefined, undefined, calc)],
  ['calculated 4 Feb 1818', D(1818, 2, 4, calc)],
  ['est 1818', D(1818, undefined, undefined, est)],
  ['est. 1818', D(1818, undefined, undefined, est)],
  ['estimated 1818', D(1818, undefined, undefined, est)],
  ['[1818]', D(1818, undefined, undefined, est)],
  ['died abt 1887', D(1887, undefined, undefined, about)],
  // --- ranges
  ['bet 1880 and 1885', D(1880, undefined, undefined, bet(1885))],
  ['bet. 1880 and 1885', D(1880, undefined, undefined, bet(1885))],
  ['BET 1880 AND 1885', D(1880, undefined, undefined, bet(1885))],
  ['between 1880 and 1885', D(1880, undefined, undefined, bet(1885))],
  ['between 1880 & 1885', D(1880, undefined, undefined, bet(1885))],
  ['btw 1880 and 1885', D(1880, undefined, undefined, bet(1885))],
  ['bet 1880-1885', D(1880, undefined, undefined, bet(1885))],
  ['from 1880 to 1885', D(1880, undefined, undefined, bet(1885))],
  ['1880 to 1885', D(1880, undefined, undefined, bet(1885))],
  ['1880 - 1885', D(1880, undefined, undefined, bet(1885))],
  ['1880-1885', D(1880, undefined, undefined, bet(1885))],
  ['1880–1885', D(1880, undefined, undefined, bet(1885))],
  ['1880—1885', D(1880, undefined, undefined, bet(1885))],
  ['1880–85', D(1880, undefined, undefined, bet(1885))],
  ['1880-85', D(1880, undefined, undefined, bet(1885))],
  ['1898–05', D(1898, undefined, undefined, bet(1905))],
  ['1880–5', D(1880, undefined, undefined, bet(1885))],
  ['1880 or 1881', D(1880, undefined, undefined, bet(1881))],
  ['1880/81', D(1880, undefined, undefined, bet(1881))],
  ['1880/1881', D(1880, undefined, undefined, bet(1881))],
  ['Mar 1880 - Jun 1881', D(1880, 3, undefined, bet(1881, 6))],
  ['bet Mar 1880 and Jun 1881', D(1880, 3, undefined, bet(1881, 6))],
  ['bet Mar and Jun 1881', D(1881, 3, undefined, bet(1881, 6))],
  ['bet 10 Mar 1887 and 12 Mar 1887', D(1887, 3, 10, bet(1887, 3, 12))],
  ['10-12 March 1887', D(1887, 3, 10, bet(1887, 3, 12))],
  ['10 - 12 March 1887', D(1887, 3, 10, bet(1887, 3, 12))],
  ['Mar 10-12, 1887', D(1887, 3, 10, bet(1887, 3, 12))],
  ['Mar 10 - 12, 1887', D(1887, 3, 10, bet(1887, 3, 12))],
  ['10 Mar - 2 Apr 1887', D(1887, 3, 10, bet(1887, 4, 2))],
  ['1880 until 1885', D(1880, undefined, undefined, bet(1885))],
  ['1709/12', D(1709, undefined, undefined, bet(1712))],
  // --- dual dating (Julian/Gregorian transition)
  ['Feb 10, 1709/10', D(1710, 2, 10, dual(1709))],
  ['10 Feb 1709/10', D(1710, 2, 10, dual(1709))],
  ['Feb 10 1709/1710', D(1710, 2, 10, dual(1709))],
  ['1709/10', D(1710, undefined, undefined, dual(1709))],
  ['Mar 1 1699/1700', D(1700, 3, 1, dual(1699))],
  ['Jan 5 1699/00', D(1700, 1, 5, dual(1699))],
  ['Jany 15th 1719/20', D(1720, 1, 15, dual(1719))],
  ['Mar 20 1751/2', D(1752, 3, 20, dual(1751))],
  ['abt 1709/10', D(1710, undefined, undefined, { ...about, ...dual(1709) })],
  ['Died Febry 3d 1735/6', D(1736, 2, 3, dual(1735))],
  // --- old/new style markers
  ['Sept 2 1752 O.S.', D(1752, 9, 2, julian)],
  ['Sept 2 1752 OS', D(1752, 9, 2, julian)],
  ['Sept 2 1752 (O.S.)', D(1752, 9, 2, julian)],
  ['Sept 14 1752 N.S.', D(1752, 9, 14, { calendar: 'gregorian' })],
  ['1740 old style', D(1740, undefined, undefined, julian)],
  // --- Quaker month numbers
  ['1st mo. 5th 1820', D(1820, 1, 5)],
  ['5th day 1st month 1820', D(1820, 1, 5)],
  ['5th of 1st mo 1820', D(1820, 1, 5)],
  ['3 mo 10 1790', D(1790, 3, 10)],
  ['12th mo 25 1850', D(1850, 12, 25)],
  ['third month 1790', D(1790, 3)],
  ['1st mo 10 1740', D(1740, 3, 10, { calendar: 'julian', ambiguous: true })],
  ['10th mo 3 1740', D(1740, 12, 3, julian)],
  ['12 mo 3 1740', D(1740, 2, 3, { calendar: 'julian', ambiguous: true })],
  // --- numeric (en-US: month first)
  ['3/4/1890', D(1890, 3, 4, amb)],
  ['03/04/1890', D(1890, 3, 4, amb)],
  ['3-4-1890', D(1890, 3, 4, amb)],
  ['3.4.1890', D(1890, 3, 4, amb)],
  ['12/25/1890', D(1890, 12, 25)],
  ['25/12/1890', D(1890, 12, 25)],
  ['4/4/1890', D(1890, 4, 4)],
  ['1/13/1890', D(1890, 1, 13)],
  ['13/1/1890', D(1890, 1, 13)],
  ['1890-03-04', D(1890, 3, 4)],
  ['1890-3-4', D(1890, 3, 4)],
  ['1890-03', D(1890, 3)],
  ['1890/03/04', D(1890, 3, 4)],
  ['1890.03.04', D(1890, 3, 4)],
  ['d. 3/4/1890', D(1890, 3, 4, amb)],
  ['abt 3/1887', D(1887, 3, undefined, about)],
  // --- other languages on immigrant stones
  ['10 März 1887', D(1887, 3, 10)],
  ['10. Maerz 1887', D(1887, 3, 10)],
  ['3. Dezember 1901', D(1901, 12, 3)],
  ['1. Januar 1850', D(1850, 1, 1)],
  ['Jänner 1850', D(1850, 1)],
  ['14 juillet 1789', D(1789, 7, 14)],
  ['1 août 1914', D(1914, 8, 1)],
  ['le 3 février 1880', D(1880, 2, 3, {})],
  ['3 de mayo de 1890', D(1890, 5, 3)],
  ['3 maart 1890', D(1890, 3, 3)],
  ['17 mei 1890', D(1890, 5, 17)],
  ['3 maggio 1890', D(1890, 5, 3)],
  ['3 oktober 1890', D(1890, 10, 3)],
  ['3 Martii 1720', D(1720, 3, 3)],
  ['3 Decembris 1720', D(1720, 12, 3)],
  // --- relative months without context: nothing to resolve
  ['3d inst.', NONE],
  ['the 3d ult.', NONE],
  ['the 3d inst', NONE],
  // --- not dates
  ['', NONE],
  ['   ', NONE],
  ['unknown', NONE],
  ['illegible', NONE],
  ['?', NONE],
  ['----', NONE],
  ['Mar 3 1887 at Boston', NONE],
  ['19th century', NONE],
  ['3/4', NONE],
  ['3/4/90', NONE],
  ['Mar 40 1887', NONE],
  ['13/13/1890', NONE],
  ['1890-13', NONE],
  ['999', NONE],
  ['3500', NONE],
  ['Mar Apr 1887', NONE],
  ['1887 1888', NONE],
  ['10', NONE],
  ['bet 1880', NONE],
  ['Wm. Smith', NONE],
  ['aged 72', NONE],
  ['n.d.', NONE],
];

describe('parseDate table', () => {
  it('has 200+ cases', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(200);
  });

  it.each(CASES)('%s', (input, expected) => {
    expect(parseDate(input)).toEqual({ original: input, ...expected });
  });
});

describe('parseDate options', () => {
  it('reads numeric dates day-first in day-first locales', () => {
    expect(parseDate('3/4/1890', { dateLocale: 'en-GB' })).toEqual({
      original: '3/4/1890',
      y: 1890,
      m: 4,
      d: 3,
      ambiguous: true,
    });
    expect(parseDate('25/12/1890', { dateLocale: 'de-DE' })).toMatchObject({ m: 12, d: 25 });
    expect(parseDate('12/25/1890', { dateLocale: 'fr-FR' })).toMatchObject({ m: 12, d: 25 });
    expect(parseDate('3.4.1890', { dateLocale: 'de' })).toMatchObject({ m: 4, d: 3 });
  });

  it('finds the locale order from Intl', () => {
    expect(numericDateOrder('en-US')).toBe('mdy');
    expect(numericDateOrder('en-GB')).toBe('dmy');
    expect(numericDateOrder('ja-JP')).toBe('ymd');
    expect(numericDateOrder('not a locale')).toBe('dmy');
  });

  it('resolves inst., ult. and prox. against a context month', () => {
    const context = { y: 1850, m: 1 };
    expect(parseDate('the 3d inst.', { context })).toMatchObject({ y: 1850, m: 1, d: 3 });
    expect(parseDate('the 28th ult.', { context })).toMatchObject({ y: 1849, m: 12, d: 28 });
    expect(parseDate('5th prox.', { context })).toMatchObject({ y: 1850, m: 2, d: 5 });
  });

  it('recognizes Hebrew dates without converting them yet', () => {
    expect(parseDate('ג׳ אדר תרנ״ה')).toEqual({ original: 'ג׳ אדר תרנ״ה', calendar: 'hebrew' });
    expect(formatDate({ original: 'ג׳ אדר תרנ״ה', calendar: 'hebrew' })).toBe('ג׳ אדר תרנ״ה');
  });
});

describe('formatDate', () => {
  it.each([
    ['10 March 1887', '10 Mar 1887'],
    ['abt 1887', 'abt 1887'],
    ['before Mar 1887', 'bef Mar 1887'],
    ['after 1887', 'aft 1887'],
    ['calc 1818', 'calc 1818'],
    ['[1818]', 'est 1818'],
    ['1880–85', 'bet 1880 and 1885'],
    ['Mar 10-12, 1887', 'bet 10 Mar 1887 and 12 Mar 1887'],
    ['Feb 10, 1709/10', '10 Feb 1709/10'],
    ['Mar 1 1699/1700', '1 Mar 1699/00'],
    ['Sept 2 1752 O.S.', '2 Sep 1752 O.S.'],
    ['June', 'Jun'],
    ['unknown', 'unknown'],
    ['3d inst.', '3d inst.'],
  ])('%s -> %s', (input, out) => {
    expect(formatDate(parseDate(input))).toBe(out);
  });

  it('round-trips every table case: format(parse(x)) is stable', () => {
    for (const [input] of CASES) {
      const once = formatDate(parseDate(input));
      const again = formatDate(parseDate(once));
      expect(again, input).toBe(once);
    }
  });

  it('round-trips the parts (apart from the locale ambiguity flag)', () => {
    const strip = (d: FuzzyDate): Partial<FuzzyDate> => {
      const rest: Partial<FuzzyDate> = { ...d };
      delete rest.original;
      delete rest.ambiguous;
      return rest;
    };
    for (const [input] of CASES) {
      const p = parseDate(input);
      if (p.y === undefined && p.m === undefined) continue;
      const back = strip(parseDate(formatDate(p)));
      const want = strip(p);
      if (want.calendar === 'gregorian') delete want.calendar; // N.S. is implied on output
      expect(back, input).toEqual(want);
    }
  });
});

describe('parseAge', () => {
  it.each([
    ['aged 72y 3m 5d', { y: 72, m: 3, d: 5 }],
    ['Aged 72 years, 3 months & 5 days', { y: 72, m: 3, d: 5 }],
    ['aged 72 yrs. 3 mos. 5 ds.', { y: 72, m: 3, d: 5 }],
    ["Aged 72 y's 3 m's 5 d's", { y: 72, m: 3, d: 5 }],
    ['72 years 3 months and 5 days', { y: 72, m: 3, d: 5 }],
    ['Æ 72', { y: 72 }],
    ['Æ. 72', { y: 72 }],
    ['AE. 72 yrs', { y: 72 }],
    ['Æt. 45', { y: 45 }],
    ['aetat 45', { y: 45 }],
    ['aged 72', { y: 72 }],
    ['72', { y: 72 }],
    ['Aged 72 years', { y: 72 }],
    ['aged 3 mos', { m: 3 }],
    ['aged 10 days', { d: 10 }],
    ['aged 3 weeks', { d: 21 }],
    ['aged 1 yr 2 wks', { y: 1, d: 14 }],
    ['aged 2½ years', { y: 2, m: 6 }],
    ['72:3:5', { y: 72, m: 3, d: 5 }],
    ['aged 72-3-5', { y: 72, m: 3, d: 5 }],
    ['in his 73rd year', { y: 72 }],
    ['in her 73d year', { y: 72 }],
    ['In the 73rd year of his age', { y: 72 }],
    ['in his twenty-first year', { y: 20 }],
  ])('%s', (input, expected) => {
    expect(parseAge(input)).toEqual({ ...expected, original: input });
  });

  it.each(['', 'aged', 'old', 'aged 5 hours', 'aged many years'])('rejects %j', (input) => {
    expect(parseAge(input)).toBeUndefined();
  });
});

describe('calculateBirth', () => {
  const death = (s: string) => parseDate(s);

  it('subtracts y/m/d without borrowing when none is needed', () => {
    expect(calculateBirth(death('May 20 1890'), { y: 72, m: 3, d: 5, original: '' })).toEqual({
      original: 'calc 15 Feb 1818',
      y: 1818,
      m: 2,
      d: 15,
      qualifier: 'calculated',
    });
  });

  it('borrows 30 days and 12 months (the carver’s method, as in the 8870 rule)', () => {
    // 5 Mar 1890 - 0y 0m 10d: day 5-10 -> 25 (borrowing 30), month 3-1 -> Feb
    expect(calculateBirth(death('Mar 5 1890'), { d: 10, original: '' })).toMatchObject({
      y: 1890,
      m: 2,
      d: 25,
    });
    // 3 Feb 1890 - 72y 5m 10d: 3-10 -> 23, month 2-1-5 = -4 -> 8, year 1890-72-1
    expect(calculateBirth(death('Feb 3 1890'), { y: 72, m: 5, d: 10, original: '' })).toMatchObject(
      { y: 1817, m: 8, d: 23 },
    );
  });

  it('clamps an impossible day to the end of the month', () => {
    // 30 Mar 1890 - 1 month -> "30 Feb" -> 28 Feb 1890
    expect(calculateBirth(death('Mar 30 1890'), { m: 1, d: 0, original: '' })).toMatchObject({
      y: 1890,
      m: 2,
      d: 28,
    });
  });

  it('keeps only the precision the inputs support', () => {
    expect(calculateBirth(death('May 20 1890'), { y: 72, original: '' })).toEqual({
      original: 'calc 1818',
      y: 1818,
      qualifier: 'calculated',
    });
    expect(calculateBirth(death('May 1890'), { y: 72, m: 3, original: '' })).toMatchObject({
      y: 1818,
      m: 2,
    });
    expect(calculateBirth(death('1890'), { y: 72, m: 3, original: '' })).toBeUndefined();
    expect(calculateBirth(death('May 1890'), { y: 72, m: 3, d: 2, original: '' })).toBeUndefined();
  });

  it('declines ranges and open-ended deaths', () => {
    expect(calculateBirth(death('bet 1880 and 1885'), { y: 72, original: '' })).toBeUndefined();
    expect(calculateBirth(death('bef 1880'), { y: 72, original: '' })).toBeUndefined();
    expect(calculateBirth(death('unknown'), { y: 72, original: '' })).toBeUndefined();
  });

  it('works end to end from carved text', () => {
    const age = parseAge('aged 72y 3m 5d');
    expect(age && calculateBirth(death('Died May 20, 1890'), age)).toMatchObject({
      y: 1818,
      m: 2,
      d: 15,
      qualifier: 'calculated',
    });
  });
});
