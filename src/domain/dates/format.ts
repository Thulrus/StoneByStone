/**
 * Canonical text for a FuzzyDate, GEDCOM-like and in English: `10 Mar 1887`, `abt 1887`,
 * `bet 1880 and 1885`, `10 Feb 1709/10`, `1790 O.S.`. `parseDate` reads it back to the same
 * parts, so `formatDate(parseDate(x))` is stable. Localized display belongs to the UI layer.
 * Dates with nothing structured (or non-Gregorian/Julian calendars) format as `original`.
 */
import type { DateQualifier, FuzzyDate } from '../types';
import { MONTH_ABBR } from './vocab';

const PREFIX: Partial<Record<DateQualifier, string>> = {
  about: 'abt ',
  before: 'bef ',
  after: 'aft ',
  calculated: 'calc ',
  estimated: 'est ',
};

function core(y?: number, m?: number, d?: number, dual?: number): string | undefined {
  if (y === undefined && m === undefined) return undefined;
  const parts: string[] = [];
  if (d !== undefined && m !== undefined) parts.push(String(d));
  if (m !== undefined) parts.push(MONTH_ABBR[m - 1] ?? String(m));
  if (y !== undefined) {
    parts.push(dual !== undefined ? `${dual}/${String(y).slice(-2)}` : String(y));
  }
  return parts.join(' ');
}

export function formatDate(date: FuzzyDate): string {
  const cal = date.calendar;
  if (cal !== undefined && cal !== 'gregorian' && cal !== 'julian') return date.original;
  const start = core(date.y, date.m, date.d, date.dualYear);
  if (start === undefined) return date.original;
  let text: string;
  if (date.qualifier === 'between') {
    const end = core(date.y2, date.m2, date.d2);
    if (end === undefined) return date.original;
    text = `bet ${start} and ${end}`;
  } else {
    text = (date.qualifier ? (PREFIX[date.qualifier] ?? '') : '') + start;
  }
  if (cal === 'julian' && date.dualYear === undefined) text += ' O.S.';
  return text;
}
