/**
 * FuzzyDate parser (plan §10.1). Never throws and never loses the input: anything it cannot
 * read comes back as `{ original }` alone.
 *
 * Handles partial dates, qualifiers (abt, bef, aft, calc, est), ranges (bet .. and .., 1880–85,
 * "or"), ordinals and archaic forms (ye 3d of May, Febry, 7ber), Quaker month numbers,
 * relative months (inst., ult., prox.) when a context month is given, dual dating
 * (1709/10 -> y 1710, dualYear 1709), O.S./N.S. markers, and numeric dates read in the
 * cemetery's locale order with `ambiguous` set when day and month could swap.
 * Hebrew-script dates are recognized as `calendar: 'hebrew'` but not converted yet (M8).
 */
import type { DateQualifier, FuzzyDate } from '../types';
import {
  FILLER,
  MONTHS,
  MONTH_WORDS,
  ORDINAL_WORDS,
  RELATIVE,
  TENS_WORDS,
  UNIT_ORDINAL_VALUES,
} from './vocab';

export interface ParseDateOptions {
  /** BCP 47 locale that decides numeric order (`3/4/1890`). Default `en-US`. */
  dateLocale?: string;
  /** Month that `inst.` / `ult.` / `prox.` are relative to (e.g. the date of the notice). */
  context?: { y: number; m: number };
}

interface Parts {
  y?: number;
  m?: number;
  d?: number;
  dualYear?: number;
  calendar?: string;
  ambiguous?: boolean;
}

type Order = 'mdy' | 'dmy' | 'ymd';
const orderCache = new Map<string, Order>();

/** Numeric date order for a locale, from Intl (falls back to day-month-year). */
export function numericDateOrder(locale: string): Order {
  const cached = orderCache.get(locale);
  if (cached) return cached;
  let order: Order = 'dmy';
  try {
    const types = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC',
    })
      .formatToParts(new Date(Date.UTC(2001, 1, 3)))
      .map((p) => p.type)
      .filter((t) => t === 'year' || t === 'month' || t === 'day')
      .map((t) => t[0])
      .join('');
    if (types === 'mdy' || types === 'dmy' || types === 'ymd') order = types;
  } catch {
    // Unknown locale tag: keep the default.
  }
  orderCache.set(locale, order);
  return order;
}

const QUALIFIERS: [RegExp, DateQualifier][] = [
  [/^(?:abt|about|approx(?:imately)?|circa|cir|ca|c)\b\.?\s*|^c(?=\d)|^~\s*/, 'about'],
  [/^(?:bef|before|ante)\b\.?\s*/, 'before'],
  [/^(?:aft|after|post)\b\.?\s*/, 'after'],
  [/^(?:calc|cal|calculated)\b\.?\s*/, 'calculated'],
  [/^(?:est|estimated)\b\.?\s*/, 'estimated'],
  [/^(?:bet|betw|btw|between|from)\b\.?\s*/, 'between'],
];

const EVENT_PREFIX =
  /^(?:(?:who\s+)?(?:died|departed\s+this\s+life|departed|dep'?d|dec'?d|deceased|fell\s+asleep|entered\s+into\s+rest|born|baptized|bapt|bap|christened|chr|buried|bur'?d|bur|obiit|obit|ob'?t|ob|natus|nat|d|b)\b\.?:?\s*(?:on\s+)?)+/;

function normalize(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‐‑‒]/g, '-')
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number | undefined, m: number): number {
  if (m === 2) return y === undefined || isLeap(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

function validYear(y: number): boolean {
  return Number.isInteger(y) && y >= 1000 && y <= 2199;
}

function valid(p: Parts): boolean {
  if (p.y !== undefined && !validYear(p.y)) return false;
  if (p.m !== undefined && (p.m < 1 || p.m > 12)) return false;
  // Days are kept as carved (stones do say "Feb 30"), but must be a plausible day number.
  if (p.d !== undefined && (p.d < 1 || p.d > 31 || p.m === undefined)) return false;
  return true;
}

/** "1709/10" -> new-style 1710 with dual 1709, only where dual dating was in use. */
function dualYear(a: number, bText: string): Parts | undefined {
  const b = Number(bText);
  const full = bText.length >= 4 ? b : a - (a % 10 ** bText.length) + b;
  const next = full <= a ? full + 10 ** bText.length : full;
  if (next !== a + 1 || a >= 1753) return undefined;
  return { y: a + 1, dualYear: a, calendar: 'julian' };
}

function numericDate(s: string, order: Order): Parts | undefined {
  let m =
    /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(s) ?? /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/.exec(s);
  if (m) {
    const p: Parts = { y: Number(m[1]), m: Number(m[2]) };
    if (m[3]) p.d = Number(m[3]);
    return valid(p) ? p : undefined;
  }
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    const dayFirst = order === 'dmy' || (order === 'ymd' && a > 12);
    let [d, mo] = dayFirst ? [a, b] : [b, a];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // only one reading is possible
    const p: Parts = { y, m: mo, d };
    if (a !== b && a <= 12 && b <= 12) p.ambiguous = true;
    return p;
  }
  m = /^(\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return { y: Number(m[2]), m: Number(m[1]) };
  return undefined;
}

const TOKEN_RE = /(\d{4})\/(\d{1,4})|(\d+)(st|nd|rd|th|d|ber|br|bre)?|(\p{L}[\p{L}'^]*)|([?])/gu;

interface Single extends Parts {
  rel?: 'inst' | 'ult' | 'prox';
  uncertain?: boolean;
}

/** One date (no range). Returns undefined when any token is not understood. */
function parseSingle(s: string, order: Order): Single | undefined {
  const num = numericDate(s, order);
  if (num) return num;

  const tokens = [...s.replace(/\ba\.?\s?d\.?(?=\s|$|\d)/g, ' ').matchAll(TOKEN_RE)];
  // Anything outside the tokens must be punctuation or space.
  const leftover = s.replace(TOKEN_RE, '').replace(/\ba\.?\s?d\.?/g, '');
  if (/[^\s.,;:'"()[\]-]/.test(leftover)) return undefined;

  const p: Single = {};
  let quakerMonth = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;
    const [, dualA, dualB, digits, suffix, word, symbol] = t;
    if (dualA && dualB) {
      if (p.y !== undefined) return undefined;
      const dual = dualYear(Number(dualA), dualB);
      if (!dual) return undefined;
      Object.assign(p, dual);
    } else if (digits) {
      const n = Number(digits);
      const nextWord = tokens[i + 1]?.[5]?.replace(/['^]/g, '');
      if (suffix === 'ber' || suffix === 'br' || suffix === 'bre') {
        // 7ber = September ... 10ber = December
        if (n < 7 || n > 10 || p.m !== undefined) return undefined;
        p.m = n + 2;
      } else if (nextWord && MONTH_WORDS.has(nextWord)) {
        if (p.m !== undefined) return undefined;
        p.m = n;
        quakerMonth = true;
        i++;
      } else if (digits.length === 4 && !suffix) {
        if (p.y !== undefined) return undefined;
        p.y = n;
      } else if (n >= 1 && n <= 31 && digits.length <= 2) {
        if (p.d !== undefined) return undefined;
        p.d = n;
      } else {
        return undefined;
      }
    } else if (word) {
      const w = word.replace(/['^]/g, '');
      const month = MONTHS.get(w);
      const tens = TENS_WORDS.get(w);
      const nextUnit = UNIT_ORDINAL_VALUES.get(tokens[i + 1]?.[5] ?? '');
      if (month !== undefined) {
        if (p.m !== undefined) return undefined;
        p.m = month;
      } else if (tens !== undefined && nextUnit !== undefined) {
        if (p.d !== undefined) return undefined;
        p.d = tens + nextUnit;
        i++;
      } else if (ORDINAL_WORDS.has(w) && MONTH_WORDS.has(tokens[i + 1]?.[5] ?? '')) {
        if (p.m !== undefined) return undefined;
        p.m = ORDINAL_WORDS.get(w);
        quakerMonth = true;
        i++;
      } else if (ORDINAL_WORDS.has(w)) {
        if (p.d !== undefined) return undefined;
        p.d = ORDINAL_WORDS.get(w);
      } else if (RELATIVE.has(w)) {
        p.rel = RELATIVE.get(w);
      } else if (!FILLER.has(w)) {
        return undefined;
      }
    } else if (symbol) {
      p.uncertain = true;
    }
  }

  if (quakerMonth && p.m !== undefined && p.y !== undefined && p.y < 1752) {
    // Before 1752 the Quaker "first month" was March. Jan–Mar may also belong to the
    // previous old-style year, so flag it.
    p.m = ((p.m + 1) % 12) + 1;
    p.calendar = 'julian';
    if (p.m <= 3) p.ambiguous = true;
  }
  return p;
}

function resolveRelative(p: Single, context: ParseDateOptions['context']): void {
  if (!p.rel) return;
  if (context && p.m === undefined && p.y === undefined) {
    const offset = p.rel === 'ult' ? -1 : p.rel === 'prox' ? 1 : 0;
    const idx = context.y * 12 + (context.m - 1) + offset;
    p.y = Math.floor(idx / 12);
    p.m = (idx % 12) + 1;
  }
  delete p.rel;
}

/** Split a range into its two ends, or undefined if `s` is not a range. */
function splitRange(s: string, explicit: boolean): [string, string] | undefined {
  const tries: RegExp[] = explicit
    ? [/^(.+?)\s+(?:and|&|to|-|–|—)\s+(.+)$/, /^(.+?)\s*[-–—]\s*(.+)$/]
    : [
        // "Mar 10-12, 1887"
        /^(\D+?\s*\d{1,2})(?:st|nd|rd|th|d)?\s*[-–]\s*(\d{1,2}(?:st|nd|rd|th|d)?,?\s+\d{4})$/,
        /^(.+?)\s+(?:to|or|until|till|-|–|—)\s+(.+)$/,
        /^(.+?)\s*[–—]\s*(.+)$/,
        /^(\d{4})-(\d{2}|\d{4})$/,
        /^(\d{4})\/(\d{1,4})$/,
        /^(\d{1,2})-(\d{1,2}\s+\D.*)$/,
      ];
  for (const re of tries) {
    const m = re.exec(s);
    if (m?.[1] && m[2]) return [m[1].trim(), m[2].trim()];
  }
  return undefined;
}

function parseRange(left: string, right: string, order: Order): [Single, Single] | undefined {
  const a = parseSingle(left, order);
  if (!a) return undefined;
  let b: Single | undefined;
  if (/^\d{1,2}$/.test(right) && a.y !== undefined && a.m === undefined) {
    // 1880–85: short end year in the same century as the start.
    const len = right.length;
    let y = a.y - (a.y % 10 ** len) + Number(right);
    if (y <= a.y) y += 10 ** len;
    b = { y };
  } else {
    b = parseSingle(right, order);
  }
  if (!b) return undefined;
  if (a.y === undefined) a.y = b.y;
  if (a.m === undefined && a.d !== undefined) a.m = b.m;
  if (a.y === undefined && a.m === undefined) return undefined;
  if (b.y === undefined && b.m === undefined && b.d === undefined) return undefined;
  if (b.m === undefined && b.d !== undefined) b.m = a.m;
  if (b.y === undefined && b.m !== undefined) b.y = a.y;
  return [a, b];
}

function hasDate(p: Parts): boolean {
  return p.y !== undefined || p.m !== undefined;
}

export function parseDate(input: string, opts: ParseDateOptions = {}): FuzzyDate {
  const original = input;
  const fail: FuzzyDate = { original };
  if (/\p{Script=Hebrew}/u.test(input)) return { original, calendar: 'hebrew' };

  const order = numericDateOrder(opts.dateLocale ?? 'en-US');
  let s = normalize(input);
  let calendar: string | undefined;
  s = s.replace(/[([]?\b(o\.?\s?s\.?|old style)[)\]]?(?=\s|$)/, () => {
    calendar = 'julian';
    return ' ';
  });
  s = s.replace(/[([]?\b(n\.?\s?s\.?|new style)[)\]]?(?=\s|$)/, () => {
    calendar = 'gregorian';
    return ' ';
  });
  s = s.trim().replace(EVENT_PREFIX, '').trim();

  let qualifier: DateQualifier | undefined;
  const bracketed = /^\[(.+)\]$/.exec(s);
  if (bracketed?.[1]) {
    s = bracketed[1].trim();
    qualifier = 'estimated';
  }
  for (const [re, q] of QUALIFIERS) {
    if (re.test(s)) {
      s = s.replace(re, '').trim();
      qualifier = q;
      break;
    }
  }
  s = s.replace(/\s*\(\?\)\s*$/, '?').replace(/[.,;:\s]+$/, '');
  if (s.endsWith('?')) {
    s = s.slice(0, -1).trim();
    qualifier ??= 'about';
  }
  if (!s) return fail;

  const out: FuzzyDate = { original };
  const single = parseSingle(s, order);
  let range: [Single, Single] | undefined;
  if (!single || qualifier === 'between' || (!hasDate(single) && !single.rel)) {
    const ends = splitRange(s, qualifier === 'between');
    range = ends ? parseRange(ends[0], ends[1], order) : undefined;
    if (!range) {
      if (!single || qualifier === 'between') return fail;
    }
  }

  if (range) {
    const [a, b] = range;
    Object.assign(out, pick(a));
    if (b.y !== undefined) out.y2 = b.y;
    if (b.m !== undefined) out.m2 = b.m;
    if (b.d !== undefined) out.d2 = b.d;
    out.qualifier = 'between';
    if (b.ambiguous) out.ambiguous = true;
  } else if (single) {
    resolveRelative(single, opts.context);
    if (!hasDate(single)) return fail;
    Object.assign(out, pick(single));
    if (single.uncertain) qualifier ??= 'about';
    if (qualifier) out.qualifier = qualifier;
  }
  if (calendar && !out.calendar) out.calendar = calendar;
  if (calendar === 'gregorian' && out.dualYear === undefined) out.calendar = 'gregorian';
  if (!valid(out) || !valid({ y: out.y2, m: out.m2, d: out.d2 })) return fail;
  return out;
}

function pick(p: Single): Parts {
  const out: Parts = {};
  if (p.y !== undefined) out.y = p.y;
  if (p.m !== undefined) out.m = p.m;
  if (p.d !== undefined) out.d = p.d;
  if (p.dualYear !== undefined) out.dualYear = p.dualYear;
  if (p.calendar !== undefined) out.calendar = p.calendar;
  if (p.ambiguous) out.ambiguous = true;
  return out;
}
