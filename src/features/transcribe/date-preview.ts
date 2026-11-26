/**
 * Live readings of what was typed in a date or age field (plan §10.1). The parser lives in
 * `domain/dates`; this only puts its result into words, in the UI's language.
 */
import type { I18n } from '@lingui/core';
import { msg, plural } from '@lingui/core/macro';
import { calculateBirth, parseAge, parseDate, type Age, type FuzzyDate } from '../../domain';

export interface Reading {
  /** How the text was read, or why it couldn't be. */
  text: string;
  /** Something to check before trusting it. */
  warning?: string;
}

/** `10 March 1887`, `March 1887`, `1887`, in the UI locale (dates before 1900 are fine). */
function datePart(i18n: I18n, y?: number, m?: number, d?: number): string | undefined {
  if (y === undefined && m === undefined) return undefined;
  const at = new Date(Date.UTC(2000, (m ?? 1) - 1, d ?? 1));
  if (y !== undefined) at.setUTCFullYear(y);
  const opts: Intl.DateTimeFormatOptions = { timeZone: 'UTC' };
  if (y !== undefined) opts.year = 'numeric';
  if (m !== undefined) opts.month = 'long';
  if (m !== undefined && d !== undefined) opts.day = 'numeric';
  return new Intl.DateTimeFormat(i18n.locale, opts).format(at);
}

const RELATIVE = /\b(inst|ult|prox)\b/i;

export function describeDate(i18n: I18n, fd: FuzzyDate): Reading {
  const start = datePart(i18n, fd.y, fd.m, fd.d);
  if (start === undefined) {
    if (fd.calendar === 'hebrew') {
      return { text: i18n._(msg`Hebrew date. Kept as typed; conversion comes later.`) };
    }
    if (RELATIVE.test(fd.original)) {
      return {
        text: i18n._(msg`Kept as typed.`),
        warning: i18n._(
          msg`"inst." means this month and "ult." last month: add the month and year if the stone gives them.`,
        ),
      };
    }
    return {
      text: i18n._(msg`Not read as a date. It will be kept as typed.`),
    };
  }

  let text: string;
  switch (fd.qualifier) {
    case 'about':
      text = i18n._(msg`about ${start}`);
      break;
    case 'before':
      text = i18n._(msg`before ${start}`);
      break;
    case 'after':
      text = i18n._(msg`after ${start}`);
      break;
    case 'calculated':
      text = i18n._(msg`${start} (calculated)`);
      break;
    case 'estimated':
      text = i18n._(msg`estimated ${start}`);
      break;
    case 'between': {
      const end = datePart(i18n, fd.y2, fd.m2, fd.d2) ?? '?';
      text = i18n._(msg`between ${start} and ${end}`);
      break;
    }
    default:
      text = start;
  }
  if (fd.dualYear !== undefined) {
    const year = String(fd.y ?? '');
    const dual = `${fd.dualYear}/${year.slice(-2)}`;
    text += ' · ' + i18n._(msg`dual dated ${dual}, new-style year ${year}`);
  } else if (fd.calendar === 'julian') {
    text += ' · ' + i18n._(msg`Julian (old style)`);
  }

  let warning: string | undefined;
  if (fd.ambiguous && fd.calendar === 'julian') {
    warning = i18n._(
      msg`Before 1752 the year began in March, so January to March may belong to the year before.`,
    );
  } else if (fd.ambiguous && fd.d !== undefined && fd.m !== undefined) {
    const other = datePart(i18n, fd.y, fd.d, fd.m) ?? '';
    warning = i18n._(
      msg`Day and month could be the other way round (${other}). Read using this cemetery's date order.`,
    );
  }
  return { text, warning };
}

/** `72 years, 3 months, 5 days`. `plural` uses the app's (global) i18n. */
export function describeAge(age: Age): string {
  const parts: string[] = [];
  if (age.y !== undefined) parts.push(plural(age.y, { one: '# year', other: '# years' }));
  if (age.m !== undefined) parts.push(plural(age.m, { one: '# month', other: '# months' }));
  if (age.d !== undefined) parts.push(plural(age.d, { one: '# day', other: '# days' }));
  return parts.join(', ');
}

const IN_YEAR = /\bin (?:his|her|the|their)\b.*\byear\b/i;

export interface PersonReadings {
  born?: Reading;
  died?: Reading;
  age?: Reading;
}

/**
 * Readings for one person's Born / Died / Age as typed. With Born blank, a birth calculated
 * from Died and Age is shown under Born (it's what gets saved, marked calculated).
 */
export function readPerson(
  i18n: I18n,
  p: { born: string; died: string; age: string },
  dateLocale: string,
): PersonReadings {
  const out: PersonReadings = {};
  const died = p.died.trim() ? parseDate(p.died.trim(), { dateLocale }) : undefined;
  if (died) out.died = describeDate(i18n, died);
  const age = p.age.trim() ? parseAge(p.age.trim()) : undefined;
  if (p.age.trim()) {
    const words = age ? describeAge(age) : '';
    out.age = words
      ? {
          text: IN_YEAR.test(p.age)
            ? i18n._(msg`age ${words} ("in the Nth year" is one less)`)
            : i18n._(msg`age ${words}`),
        }
      : { text: i18n._(msg`Not read as an age. It will be kept as typed.`) };
  }
  if (p.born.trim()) out.born = describeDate(i18n, parseDate(p.born.trim(), { dateLocale }));
  else if (died && age) {
    const birth = calculateBirth(died, age);
    if (birth) {
      const at = datePart(i18n, birth.y, birth.m, birth.d) ?? '';
      out.born = { text: i18n._(msg`Calculated from the age: ${at}`) };
    }
  }
  return out;
}
