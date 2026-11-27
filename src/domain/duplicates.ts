/**
 * Duplicate detection within one cemetery's data (plan §11). Pure, and review-only: it finds
 * pairs, and never changes anything.
 *
 * - **People:** same or similar name with compatible dates. Candidates are found within
 *   blocks of the same surname sound (Soundex), so a big cemetery is not compared pairwise.
 * - **Stones:** two stones within ~1 m of each other with similar text (inscription words, or
 *   the names of the people on them).
 */
import { dateScore, isIndexRecord, nameScore } from './index-match';
import { soundex } from './names/phonetic';
import type { ID, Monument, Person } from './types';

/** Stones closer than this (metres) may be the same stone recorded twice. */
export const DUPLICATE_STONE_M = 1;

export interface PersonDuplicate {
  a: Person;
  b: Person;
  /** 0–1. */
  score: number;
  name: number;
  /** See `dateScore`; `undefined` when neither has comparable years. */
  date: number | undefined;
}

export interface StoneDuplicate {
  a: Monument;
  b: Monument;
  distanceM: number;
  /** Text similarity 0–1. */
  similarity: number;
}

/** Order-independent key of a pair, for dismissals. */
export function pairKey(a: ID, b: ID): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const fold = (s: string | undefined) =>
  (s ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

function surnameKeys(p: Person): string[] {
  const keys = new Set<string>();
  for (const s of [p.name.surname, p.name.birthSurname]) {
    const f = fold(s);
    if (f) keys.add(soundex(f));
  }
  return [...keys];
}

/** Two people who are probably not duplicates whatever their names say. */
function distinct(a: Person, b: Person): boolean {
  const sa = fold(a.name.suffix);
  const sb = fold(b.name.suffix);
  if (sa && sb && sa !== sb) return true;
  // An index record against a person on a stone is a match (the Match view), not a duplicate.
  const loose = (p: Person) => isIndexRecord(p) && !p.monumentId;
  if (loose(a) !== loose(b)) return true;
  // People who are linked to each other (father and son of one name) are not duplicates.
  return (
    !!a.relations?.some((r) => r.personId === b.id) ||
    !!b.relations?.some((r) => r.personId === a.id)
  );
}

function hasGiven(p: Person): boolean {
  return !!fold(p.name.given);
}

/**
 * Likely duplicate people, best first. A pair needs a name score of at least 0.8 and, when
 * both have years, dates within three years. With no comparable years only an identical full
 * name counts.
 */
export function findDuplicatePeople(people: readonly Person[]): PersonDuplicate[] {
  const live = people.filter((p) => !p.deleted);
  const blocks = new Map<string, Person[]>();
  for (const p of live) {
    for (const k of surnameKeys(p)) {
      const list = blocks.get(k) ?? [];
      list.push(p);
      blocks.set(k, list);
    }
  }
  const seen = new Set<string>();
  const out: PersonDuplicate[] = [];
  for (const list of blocks.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i] as Person;
        const b = list[j] as Person;
        const key = pairKey(a.id, b.id);
        if (seen.has(key)) continue;
        seen.add(key);
        if (distinct(a, b)) continue;
        const name = nameScore(a.name, b.name);
        if (name < 0.8) continue;
        const date = dateScore(a, b);
        if (date === undefined) {
          if (name < 1 || !hasGiven(a) || !hasGiven(b)) continue;
        } else if (date < 0.3) continue;
        const score = date === undefined ? name * 0.8 : 0.6 * name + 0.4 * date;
        const [x, y] = a.id < b.id ? [a, b] : [b, a];
        out.push({ a: x, b: y, score, name, date });
      }
    }
  }
  return out.sort(
    (p, q) => q.score - p.score || pairKey(p.a.id, p.b.id).localeCompare(pairKey(q.a.id, q.b.id)),
  );
}

/** Words every other stone carries, which say nothing about which stone this is. */
const COMMON = new Set(
  (
    'in of the and to at his her their here lies rest peace memory loving beloved sacred ' +
    'died born aged age ae yrs years months days mos ds wife husband son daughter mother ' +
    'father infant child relict consort stone'
  ).split(' '),
);

/** Comparable words: years and other numbers, and names (3+ letters, not boilerplate). */
function words(text: string): string[] {
  return text
    .split(/[^\p{L}\p{N}]+/u)
    .map(fold)
    .filter((w) => (/^\p{N}+$/u.test(w) ? w.length > 0 : w.length > 2 && !COMMON.has(w)));
}

function stoneWords(m: Monument, people: readonly Person[]): Set<string> {
  const parts = [m.inscription?.text, m.epitaph];
  for (const p of people) parts.push(p.name.given, p.name.surname, p.name.asCarved);
  return new Set(words(parts.filter(Boolean).join(' ')));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let both = 0;
  for (const w of a) if (b.has(w)) both++;
  return both / (a.size + b.size - both);
}

function bestNames(a: readonly Person[], b: readonly Person[]): number {
  let best = 0;
  for (const x of a) for (const y of b) best = Math.max(best, nameScore(x.name, y.name));
  return best;
}

const linked = (a: Monument, b: Monument) =>
  !!a.relatedMonuments?.some((r) => r.id === b.id) ||
  !!b.relatedMonuments?.some((r) => r.id === a.id);

/**
 * Pairs of stones closer than `DUPLICATE_STONE_M` whose text is alike (word overlap or a person's
 * name at least 0.5 / 0.8), closest first. Stones linked to each other (a footstone) are left
 * out, and so are stones with no text to compare.
 */
export function findDuplicateStones(
  stones: readonly Monument[],
  peopleByStone: ReadonlyMap<ID, readonly Person[]>,
  maxM = DUPLICATE_STONE_M,
): StoneDuplicate[] {
  const placed = stones.filter((m) => !m.deleted && m.position);
  const first = placed[0]?.position;
  if (!first) return [];
  const kx = 111_320 * Math.cos((first.lat * Math.PI) / 180);
  const ky = 110_574;
  const xy = (m: Monument) => {
    const p = m.position as { lng: number; lat: number };
    return [(p.lng - first.lng) * kx, (p.lat - first.lat) * ky] as const;
  };
  const cell = (v: number) => Math.floor(v / maxM);
  const grid = new Map<string, Monument[]>();
  for (const m of placed) {
    const [x, y] = xy(m);
    const k = `${cell(x)},${cell(y)}`;
    const list = grid.get(k) ?? [];
    list.push(m);
    grid.set(k, list);
  }
  const textOf = new Map<ID, Set<string>>();
  const text = (m: Monument) => {
    let w = textOf.get(m.id);
    if (!w) textOf.set(m.id, (w = stoneWords(m, peopleByStone.get(m.id) ?? [])));
    return w;
  };
  const out: StoneDuplicate[] = [];
  for (const a of placed) {
    const [ax, ay] = xy(a);
    const cx = cell(ax);
    const cy = cell(ay);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const b of grid.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (b.id <= a.id) continue;
          const [bx, by] = xy(b);
          const d = Math.hypot(ax - bx, ay - by);
          if (d >= maxM || linked(a, b)) continue;
          const overlap = jaccard(text(a), text(b));
          const names = bestNames(peopleByStone.get(a.id) ?? [], peopleByStone.get(b.id) ?? []);
          if (overlap < 0.5 && names < 0.8) continue;
          out.push({ a, b, distanceM: d, similarity: Math.max(overlap, names) });
        }
      }
    }
  }
  return out.sort(
    (p, q) =>
      p.distanceM - q.distanceM || pairKey(p.a.id, p.b.id).localeCompare(pairKey(q.a.id, q.b.id)),
  );
}
