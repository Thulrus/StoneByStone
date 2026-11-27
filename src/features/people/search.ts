/**
 * People index and search (plan §11): MiniSearch over names, inscriptions and notes with our own
 * normalizers. Names match accent- and punctuation-blind, carved abbreviations match their full
 * form (`Wm` ↔ `William`), and surnames also match by sound (Soundex and Daitch–Mokotoff, so
 * Schmidt / Smith / Smyth cluster). Filters narrow by date, section, status, symbol, material
 * and veteran. Results without a query are in collated name order.
 */
import MiniSearch, { type Query } from 'minisearch';
import {
  daitchMokotoff,
  expandAbbreviation,
  soundex,
  type ID,
  type Monument,
  type MonumentStatus,
  type Person,
  type Row,
} from '../../domain';

/** Lowercase, no accents or punctuation: `Wm.` → `wm`, `Zoë` → `zoe`, `O'Brien` → `obrien`. */
export function foldWord(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}-]/gu, '');
}

/** Words of free text, folded; a hyphenated word also gives its parts. */
export function wordsOf(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\s,;:()[\]"/&]+/u)) {
    const w = foldWord(raw).replace(/^-+|-+$/g, '');
    if (!w) continue;
    out.push(w);
    if (w.includes('-')) out.push(...w.split('-').filter(Boolean));
  }
  return out;
}

/** A word and, if it is a carved abbreviation, its full form. */
function withExpansion(w: string): string[] {
  const full = expandAbbreviation(w);
  const f = full ? foldWord(full) : undefined;
  return f && f !== w ? [w, f] : [w];
}

/** Phonetic keys of a surname-like word: `s` + Soundex (`ss530`), `d` + each D–M code. */
export function soundKeys(word: string): string[] {
  if (word.replace(/[^\p{L}]/gu, '').length < 2) return [];
  const sx = soundex(word);
  return [...(sx ? [`s${sx.toLowerCase()}`] : []), ...daitchMokotoff(word).map((c) => `d${c}`)];
}

export interface PeopleFilters {
  /** Died (or, with no death date, buried / born) in this year or later. */
  from?: number;
  to?: number;
  /** A section id, or `'none'` for stones in no section. */
  section?: ID | 'none';
  /** A stone status, or `'no-stone'` for people on no stone (imported index records). */
  status?: MonumentStatus | 'no-stone';
  symbol?: string;
  material?: string;
  veteran?: boolean;
}

/** How a person's name reads in lists: as carved, else assembled from its parts. */
export function personName(p: Pick<Person, 'name'>): string {
  const n = p.name;
  return (
    n.asCarved?.trim() ||
    [n.prefix, n.given, n.middle, n.surname, n.suffix].filter(Boolean).join(' ') ||
    n.romanized ||
    ''
  );
}

/** How many filters are set. */
export function activeFilterCount(f: PeopleFilters): number {
  return Object.values(f).filter((v) => v !== undefined && v !== false && v !== '').length;
}

/** `f` without unset fields (empty, `undefined`, `false`). */
export function cleanFilters(f: PeopleFilters): PeopleFilters {
  return Object.fromEntries(
    Object.entries(f).filter(([, v]) => v !== undefined && v !== false && v !== ''),
  ) as PeopleFilters;
}

export interface PersonHit {
  person: Person;
  stone: Monument | undefined;
  /** 0 with no query. */
  score: number;
}

export interface PeopleIndex {
  search(query: string, filters?: PeopleFilters): PersonHit[];
  size: number;
}

interface Doc {
  id: ID;
  name: string;
  surname: string;
  text: string;
}

export const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

/** Surname, then given names, then death year, in the user's collation. */
export function compareByName(a: Person, b: Person): number {
  const sa = a.name.surname ?? a.name.asCarved ?? '';
  const sb = b.name.surname ?? b.name.asCarved ?? '';
  return (
    collator.compare(sa, sb) ||
    collator.compare(
      [a.name.given, a.name.middle].filter(Boolean).join(' '),
      [b.name.given, b.name.middle].filter(Boolean).join(' '),
    ) ||
    (a.death?.y ?? 0) - (b.death?.y ?? 0) ||
    a.id.localeCompare(b.id)
  );
}

/** The year used by the date filter. */
export function yearOf(p: Person): number | undefined {
  return p.death?.y ?? p.burial?.y ?? p.birth?.y;
}

function nameText(p: Person): string {
  const n = p.name;
  return [
    n.asCarved,
    n.prefix,
    n.given,
    n.middle,
    n.surname,
    n.birthSurname,
    n.suffix,
    n.nickname,
    n.romanized,
  ]
    .filter(Boolean)
    .join(' ');
}

const FIELDS = ['name', 'surname', 'text'];

export function buildPeopleIndex(
  people: readonly Person[],
  stones: readonly Monument[],
  rows: readonly Row[],
): PeopleIndex {
  const live = people.filter((p) => !p.deleted);
  const stoneById = new Map(stones.filter((m) => !m.deleted).map((m) => [m.id, m]));
  const personById = new Map(live.map((p) => [p.id, p]));
  const sectionOfRow = new Map(rows.map((r) => [r.id, r.sectionId]));

  const mini = new MiniSearch<Doc>({
    fields: FIELDS,
    tokenize: wordsOf,
    // `surname` holds ready-made sound keys.
    processTerm: (term, field) => (field === 'surname' ? term : withExpansion(term)),
    searchOptions: { tokenize: wordsOf, processTerm: (t) => t },
  });
  mini.addAll(
    live.map((p) => {
      const stone = p.monumentId ? stoneById.get(p.monumentId) : undefined;
      const surnames = [p.name.surname, p.name.birthSurname].filter(Boolean).join(' ');
      return {
        id: p.id,
        name: nameText(p),
        surname: wordsOf(surnames).flatMap(soundKeys).join(' '),
        text: [
          stone?.inscription?.text,
          stone?.epitaph,
          stone?.notes,
          stone?.carver,
          p.relationshipText,
          p.occupation,
          p.notes,
          p.military?.conflict,
          p.military?.unit,
        ]
          .filter(Boolean)
          .join(' '),
      };
    }),
  );

  const passes = (p: Person, stone: Monument | undefined, f: PeopleFilters): boolean => {
    if (f.from !== undefined || f.to !== undefined) {
      const y = yearOf(p);
      if (y === undefined) return false;
      if (f.from !== undefined && y < f.from) return false;
      if (f.to !== undefined && y > f.to) return false;
    }
    if (f.status === 'no-stone') {
      if (stone) return false;
    } else if (f.status && stone?.status !== f.status) return false;
    if (f.section !== undefined) {
      const rowId = stone?.address?.rowId;
      const sec = stone?.address?.sectionId ?? (rowId ? sectionOfRow.get(rowId) : undefined);
      if (f.section === 'none' ? !stone || sec !== undefined : sec !== f.section) return false;
    }
    if (f.symbol && !stone?.symbols?.includes(f.symbol)) return false;
    if (f.material && stone?.material !== f.material) return false;
    if (f.veteran && !p.military && !stone?.flags?.includes('veteran-marker')) return false;
    return true;
  };

  return {
    size: live.length,
    search(query, filters = {}) {
      const words = wordsOf(query);
      const hit = (p: Person, score: number): PersonHit => ({
        person: p,
        stone: p.monumentId ? stoneById.get(p.monumentId) : undefined,
        score,
      });
      if (words.length === 0) {
        return live
          .map((p) => hit(p, 0))
          .filter((h) => passes(h.person, h.stone, filters))
          .sort((a, b) => compareByName(a.person, b.person));
      }
      // Every word must match: by spelling (with prefix and a little fuzz) or a surname by sound.
      const tree: Query = {
        combineWith: 'AND',
        queries: words.map((w): Query => ({
          combineWith: 'OR',
          queries: [
            {
              queries: withExpansion(w),
              fields: ['name', 'text'],
              boost: { name: 3 },
              prefix: true,
              fuzzy: (term) => (term.length >= 5 ? 1 : false),
            },
            ...(soundKeys(w).length > 0
              ? [{ queries: soundKeys(w), fields: ['surname'], boost: { surname: 0.5 } }]
              : []),
          ],
        })),
      };
      const out: PersonHit[] = [];
      for (const r of mini.search(tree)) {
        const p = personById.get(r.id as ID);
        if (!p) continue;
        const h = hit(p, r.score);
        if (passes(p, h.stone, filters)) out.push(h);
      }
      return out.sort((a, b) => b.score - a.score || compareByName(a.person, b.person));
    },
  };
}
