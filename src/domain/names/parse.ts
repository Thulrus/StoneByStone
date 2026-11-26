/**
 * Name parsing (plan §10.2). Splits a carved or typed name into structured parts and always
 * keeps the input as `asCarved`. Parts keep their carved spelling and case; expansion of
 * abbreviations (`Wm.` -> William) is for search keys only.
 */
import type { PersonName } from '../types';
import { expandGivenNames } from './abbreviations';
import { daitchMokotoff, soundex } from './phonetic';

const PREFIXES = new Set([
  'adm', 'brig', 'cap', 'capt', 'cmdr', 'col', 'corp', 'cpl', 'dame', 'dea', 'deacon', 'dr',
  'elder', 'ens', 'fr', 'gen', 'hon', 'judge', 'lady', 'lieut', 'lord', 'lt', 'maj', 'master',
  'miss', 'mr', 'mrs', 'ms', 'mstr', 'priv', 'prof', 'pvt', 'rev', 'revd', 'serg', 'sergt',
  'sgt', 'sir', 'squire',
]); // prettier-ignore

const SUFFIXES = new Set([
  'jr', 'jun', 'junr', 'jnr', 'sr', 'sen', 'senr', 'snr', '2d', '2nd', '3d', '3rd', '4th',
  '5th', 'ii', 'iii', 'iv', 'esq', 'esqr', 'md', 'dd', 'phd', 'rn',
]); // prettier-ignore

/** Lowercase words that belong to the surname that follows them. */
const PARTICLES = new Set([
  'al', 'bin', 'da', 'das', 'de', 'del', 'della', 'den', 'der', 'des', 'di', 'do', 'dos', 'du',
  'el', 'la', 'le', 'mac', 'mc', 'st', 'ste', 'ten', 'ter', 'van', 'vande', 'vander', 'von',
  'zu', 'zum', 'zur',
]); // prettier-ignore

const BIRTH_MARKERS = new Set(['née', 'nee', 'born', 'geb', 'geborene', 'z', 'roz']);

function key(token: string): string {
  return token
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.,;:]/g, '');
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,]+$/g, '');
}

export function parseName(input: string): PersonName {
  const asCarved = clean(input);
  const out: PersonName = { asCarved };
  if (!asCarved) return out;
  let rest = ` ${asCarved} `;

  // Nickname: "William “Bill” Smith", 'William "Bill" Smith', William 'Bill' Smith
  rest = rest.replace(
    /\s["“”]([^"“”]+)["“”]\s|\s['‘]([^'‘’]+)['’]\s/,
    (_m, a?: string, b?: string) => {
      out.nickname = clean(a ?? b ?? '');
      return ' ';
    },
  );

  // Birth surname: "Mary (Jones) Smith", "Mary Smith (née Jones)", "Mary Smith née Jones"
  rest = rest.replace(/\(([^)]*)\)/, (_m, inner: string) => {
    const words = clean(inner).split(' ');
    const first = words[0] ? key(words[0]) : '';
    out.birthSurname = BIRTH_MARKERS.has(first) ? words.slice(1).join(' ') : words.join(' ');
    return ' ';
  });
  rest = rest.replace(/[\s,]+(née|nee|born|geb\.?|geborene)\s+(.+)$/i, (_m, _w, name: string) => {
    out.birthSurname = clean(name);
    return ' ';
  });
  if (out.birthSurname === '') delete out.birthSurname;

  // Comma-separated suffixes at the end ("John Smith, Jr., M.D.").
  const parts = rest.split(',').map(clean).filter(Boolean);
  const suffixes: string[] = [];
  while (parts.length > 1 && isSuffixGroup(parts[parts.length - 1] ?? '')) {
    suffixes.unshift(parts.pop() ?? '');
  }

  let tokens: string[];
  let surnameFirst: string[] | undefined;
  if (parts.length > 1) {
    // "Smith, John William"
    surnameFirst = (parts[0] ?? '').split(' ');
    tokens = parts.slice(1).join(' ').split(' ');
  } else {
    tokens = (parts[0] ?? '').split(' ').filter(Boolean);
  }

  const prefixes: string[] = [];
  while (tokens.length > 1 && PREFIXES.has(key(tokens[0] ?? '')))
    prefixes.push(tokens.shift() ?? '');
  while (tokens.length > 1 && SUFFIXES.has(key(tokens[tokens.length - 1] ?? ''))) {
    suffixes.unshift(tokens.pop() ?? '');
  }
  if (prefixes.length) out.prefix = prefixes.join(' ');
  if (suffixes.length) out.suffix = suffixes.join(' ');

  if (surnameFirst) {
    out.surname = surnameFirst.join(' ');
  } else if (tokens.length > 1) {
    let start = tokens.length - 1;
    while (start > 1 && PARTICLES.has(key(tokens[start - 1] ?? ''))) start--;
    out.surname = tokens.splice(start).join(' ');
  }
  if (tokens[0]) out.given = tokens[0];
  if (tokens.length > 1) out.middle = tokens.slice(1).join(' ');
  return out;
}

function isSuffixGroup(part: string): boolean {
  const words = part.split(' ');
  return words.length > 0 && words.every((w) => SUFFIXES.has(key(w)));
}

export interface NameSearchKeys {
  /** Given and middle names with abbreviations expanded, lowercased. */
  given: string;
  surnameSoundex: string;
  surnameDM: string[];
  birthSurnameSoundex?: string;
  birthSurnameDM?: string[];
}

/** Keys for phonetic search (Schmidt / Smith / Smyth cluster under both codes). */
export function nameSearchKeys(name: PersonName): NameSearchKeys {
  const given = expandGivenNames([name.given, name.middle].filter(Boolean).join(' '));
  const keys: NameSearchKeys = {
    given: given.toLowerCase(),
    surnameSoundex: soundex(name.surname ?? ''),
    surnameDM: daitchMokotoff(name.surname ?? ''),
  };
  if (name.birthSurname) {
    keys.birthSurnameSoundex = soundex(name.birthSurname);
    keys.birthSurnameDM = daitchMokotoff(name.birthSurname);
  }
  return keys;
}
