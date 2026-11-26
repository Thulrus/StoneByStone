/**
 * Age at death (plan §10.1): parse carved ages and calculate a birth date from death + age.
 *
 * Birth is computed the way 19th-century stones (and the "8870" tombstone rule) did it:
 * subtract years, months and days separately, borrowing 30 days per month and 12 months per
 * year, then clamp the day to the length of the resulting month. This is not the same as
 * counting days back, and matching the carver's arithmetic is the point.
 */
import type { Age, FuzzyDate } from '../types';
import { formatDate } from './format';
import { daysInMonth } from './parse';
import { ORDINAL_WORDS, TENS_WORDS, UNIT_ORDINAL_VALUES } from './vocab';

const UNIT_RE =
  /(\d+(?:\.5)?|\.5)\s*(years?|yrs?|ys|y|months?|mos?|mons?|mths?|ms|m|weeks?|wks?|w|days?|dys?|ds|d)(?![a-z])/g;

function unitOf(u: string): 'y' | 'm' | 'w' | 'd' {
  if (u.startsWith('y')) return 'y';
  if (u.startsWith('w')) return 'w';
  if (u.startsWith('d')) return 'd';
  return 'm';
}

export function parseAge(input: string): Age | undefined {
  const original = input;
  // ½ first: NFKC would turn it into 1⁄2.
  const s = input
    .replace(/\s*½/g, '.5')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // "in his 73rd year", "in the 73d year of her age": age is one less than the ordinal.
  const ord = /\bin (?:his|her|the|their) (\d+)(?:st|nd|rd|th|d)? year\b/.exec(s);
  if (ord?.[1]) return { y: Math.max(0, Number(ord[1]) - 1), original };
  const ordWord = /\bin (?:his|her|the) ([a-z-]+) year\b/.exec(s);
  if (ordWord?.[1]) {
    const [first = '', second = ''] = ordWord[1].split('-');
    const n = second
      ? (TENS_WORDS.get(first) ?? 0) + (UNIT_ORDINAL_VALUES.get(second) ?? NaN)
      : ORDINAL_WORDS.get(first);
    if (n) return { y: n - 1, original };
  }

  const rest = s
    .replace(
      /^(?:aged|age|ae|æ|æt|aet|aetat|ætatis|aetatis|at age|at|in)(?=[\s.:]|\d|$)\.?:?\s*/g,
      '',
    )
    .replace(/^(?:aged|age)\b\.?\s*/, '')
    .trim();

  // "72:3:5" or "72-3-5" (y:m:d, common in transcriptions)
  const colon = /^(\d{1,3})[:-](\d{1,2})[:-](\d{1,2})$/.exec(rest);
  if (colon) return { y: Number(colon[1]), m: Number(colon[2]), d: Number(colon[3]), original };

  // Bare number: "Æ 72", "aged 72"
  const bare = /^(\d{1,3})(?:\s*yrs?\.?)?$/.exec(rest);
  if (bare) return { y: Number(bare[1]), original };

  const age: Age = { original };
  let found = false;
  let days = 0;
  for (const m of rest.matchAll(UNIT_RE)) {
    const raw = m[1] ?? '';
    const half = raw.includes('.5');
    const n = Math.floor(Number(raw) || 0);
    const unit = unitOf(m[2] ?? '');
    found = true;
    if (unit === 'y') {
      age.y = (age.y ?? 0) + n;
      if (half) age.m = (age.m ?? 0) + 6;
    } else if (unit === 'm') {
      age.m = (age.m ?? 0) + n;
      if (half) days += 15;
    } else if (unit === 'w') {
      days += n * 7 + (half ? 3 : 0);
    } else {
      days += n;
    }
  }
  if (!found) return undefined;
  // Anything left besides separators means we misread it.
  const leftover = rest.replace(UNIT_RE, '').replace(/[\s,.&;]|and/g, '');
  if (leftover) return undefined;
  if (days) age.d = days;
  return age;
}

/**
 * Birth date from a death date and an age, marked `calculated`. Precision follows the
 * inputs: years only -> year; with months -> month; with days -> full date. Returns
 * undefined when the death date is not precise enough or is itself a range.
 */
export function calculateBirth(death: FuzzyDate, age: Age): FuzzyDate | undefined {
  if (
    death.y === undefined ||
    (age.y === undefined && age.m === undefined && age.d === undefined)
  ) {
    return undefined;
  }
  if (
    death.qualifier === 'between' ||
    death.qualifier === 'before' ||
    death.qualifier === 'after'
  ) {
    return undefined;
  }
  const wantMonth = age.m !== undefined || age.d !== undefined;
  const wantDay = age.d !== undefined;
  if ((wantMonth && death.m === undefined) || (wantDay && death.d === undefined)) {
    return undefined;
  }

  let y = death.y - (age.y ?? 0);
  let m = (death.m ?? 1) - (age.m ?? 0);
  let d = (death.d ?? 1) - (age.d ?? 0);
  while (d < 1) {
    d += 30;
    m -= 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  const out: FuzzyDate = { original: '', y, qualifier: 'calculated' };
  if (wantMonth) out.m = m;
  if (wantDay) out.d = Math.min(d, daysInMonth(y, m));
  out.original = formatDate(out);
  return out;
}
