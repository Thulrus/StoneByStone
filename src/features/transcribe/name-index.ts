/**
 * Name autocomplete for the desk form (plan §9): names already in this cemetery, including
 * imported index records. Built once per change of the people list and searched in memory,
 * so a lookup is well under the 50 ms budget even for tens of thousands of names.
 */
import { expandAbbreviation, type Person } from '../../domain';

interface Entry {
  text: string;
  tokens: string[];
  count: number;
}

export interface NameIndex {
  names: Entry[];
  surnames: Entry[];
}

/** Lowercase, no accents or punctuation: `Wm.` -> `wm`, `Zoë` -> `zoe`. */
const norm = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim();

const words = (s: string) => norm(s).split(/\s+/).filter(Boolean);

/** Words plus the full form of any carved abbreviation (`wm` also gives `william`). */
function tokensOf(text: string): string[] {
  const out = new Set<string>();
  for (const w of words(text)) {
    out.add(w);
    const full = expandAbbreviation(w);
    if (full) out.add(norm(full));
  }
  return [...out];
}

function add(map: Map<string, Entry>, text: string) {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return;
  const k = norm(t);
  const e = map.get(k);
  if (e) e.count++;
  else map.set(k, { text: t, tokens: tokensOf(t), count: 1 });
}

const byUse = (a: Entry, b: Entry) => b.count - a.count || a.text.localeCompare(b.text);

export function buildNameIndex(people: readonly Pick<Person, 'name' | 'deleted'>[]): NameIndex {
  const names = new Map<string, Entry>();
  const surnames = new Map<string, Entry>();
  for (const p of people) {
    if (p.deleted) continue;
    const n = p.name;
    add(
      names,
      n.asCarved ?? [n.prefix, n.given, n.middle, n.surname, n.suffix].filter(Boolean).join(' '),
    );
    if (n.surname) add(surnames, n.surname);
    if (n.birthSurname) add(surnames, n.birthSurname);
  }
  return { names: [...names.values()].sort(byUse), surnames: [...surnames.values()].sort(byUse) };
}

/**
 * Suggestions for what's typed: whole names whose words start with every typed word, then
 * the typed text with its last word completed to a known surname (`John Whit` ->
 * `John Whitcomb`) when no whole name fits. Never the text itself.
 */
export function suggestNames(index: NameIndex, typed: string, limit = 6): string[] {
  const want = words(typed);
  const last = want.at(-1);
  if (!last) return [];
  const alts = want.map((w) => {
    const full = expandAbbreviation(w);
    return full ? [w, norm(full)] : [w];
  });
  const self = norm(typed);
  const out: string[] = [];
  const seen = new Set<string>([self]);
  const push = (text: string) => {
    const k = norm(text);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(text);
  };

  for (const e of index.names) {
    if (out.length >= limit) return out;
    if (alts.every((a) => a.some((w) => e.tokens.some((t) => t.startsWith(w))))) push(e.text);
  }
  if (out.length || last.length < 2) return out;
  const head = typed.trimEnd().replace(/\S+$/u, '');
  for (const e of index.surnames) {
    if (out.length >= limit) break;
    if (e.tokens[0]?.startsWith(last) && e.tokens[0] !== last) push(head + e.text);
  }
  return out;
}
