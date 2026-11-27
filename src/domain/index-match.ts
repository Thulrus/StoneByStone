/**
 * Matching imported index records to stones (plan §11, §9 "matching panel"). Pure. A record
 * is scored against each stone by name (against the people transcribed on it, or the words of
 * its inscription), dates, and the index's section / row / plot against the stone's place.
 * Scores are 0–1; a clear date conflict sinks a candidate.
 */
import { expandAbbreviation } from './names/abbreviations';
import { daitchMokotoff, soundex } from './names/phonetic';
import type { FuzzyDate, Monument, Person, PersonName, SourceLocation } from './types';

export interface StoneContext {
  stone: Monument;
  /** Live people on the stone. */
  people: readonly Person[];
  /** The stone's section name and row label as the user wrote them, when it has them. */
  section?: string | undefined;
  row?: string | undefined;
}

export interface MatchReasons {
  /** 0–1. */
  name: number;
  /** 1 same year … 0 far apart, −1 a clear conflict; `undefined` when a side has no year. */
  date: number | undefined;
  /** Share of the index's section / row / plot that agree; `undefined` when not comparable. */
  place: number | undefined;
}

export interface MatchCandidate {
  stone: Monument;
  /** The person on the stone this record most likely is, if any. */
  person: Person | undefined;
  score: number;
  reasons: MatchReasons;
}

const fold = (s: string | undefined) =>
  (s ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

function firstGiven(n: PersonName): string {
  const w = (n.given ?? '').trim().split(/\s+/u)[0] ?? '';
  const f = fold(w);
  const full = expandAbbreviation(f);
  return full ? fold(full) : f;
}

function soundsAlike(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (soundex(a) === soundex(b)) return true;
  const db = new Set(daitchMokotoff(b));
  return daitchMokotoff(a).some((c) => db.has(c));
}

/** Surname agreement 0–1, counting a birth surname on either side. */
function surnameScore(a: PersonName, b: PersonName): number {
  const as = [a.surname, a.birthSurname].map(fold).filter(Boolean);
  const bs = [b.surname, b.birthSurname].map(fold).filter(Boolean);
  let best = 0;
  for (const x of as) {
    for (const y of bs) {
      if (x === y) return 1;
      if (soundsAlike(x, y)) best = Math.max(best, 0.7);
    }
  }
  return best;
}

function givenScore(a: PersonName, b: PersonName): number {
  const x = firstGiven(a);
  const y = firstGiven(b);
  if (!x || !y) return 0.5;
  if (x === y) return 1;
  if ((x.length === 1 && y.startsWith(x)) || (y.length === 1 && x.startsWith(y))) return 0.6;
  if (soundsAlike(x, y)) return 0.5;
  return 0;
}

/** How alike two names are, 0–1. Surname counts most; a given name alone counts little. */
export function nameScore(a: PersonName, b: PersonName): number {
  const s = surnameScore(a, b);
  const g = givenScore(a, b);
  return s === 0 ? g * 0.2 : 0.6 * s + 0.4 * g;
}

function years(d: FuzzyDate | undefined): number[] {
  if (d?.y === undefined) return [];
  return [
    d.y,
    ...(d.dualYear !== undefined ? [d.dualYear] : []),
    ...(d.y2 !== undefined ? [d.y2] : []),
  ];
}

/** Year agreement: 1 same, 0.6 one apart, 0.3 within 3, 0 within 10, −1 beyond. */
export function yearScore(a: FuzzyDate | undefined, b: FuzzyDate | undefined): number | undefined {
  const ya = years(a);
  const yb = years(b);
  if (ya.length === 0 || yb.length === 0) return undefined;
  const diff = Math.min(...ya.flatMap((x) => yb.map((y) => Math.abs(x - y))));
  if (diff === 0) return 1;
  if (diff === 1) return 0.6;
  if (diff <= 3) return 0.3;
  if (diff <= 10) return 0;
  return -1;
}

/** Birth and death year agreement of two people (see `yearScore`); `undefined` when not comparable. */
export function dateScore(r: Person, p: Person): number | undefined {
  const death = yearScore(r.death ?? r.burial, p.death ?? p.burial);
  const birth = yearScore(r.birth, p.birth);
  if (death === undefined) return birth;
  if (birth === undefined) return death;
  return Math.min(death, birth) < 0 ? -1 : (2 * death + birth) / 3;
}

/** Where an index puts this record. */
export function indexLocation(r: Pick<Person, 'sources'>): SourceLocation | undefined {
  return r.sources?.find((s) => s.kind === 'imported-index' && s.location)?.location;
}

function placeScore(loc: SourceLocation | undefined, ctx: StoneContext): number | undefined {
  if (!loc) return undefined;
  const a = ctx.stone.address;
  const position = a?.rowIndex !== undefined ? String(a.rowIndex + 1) : undefined;
  const pairs: [string | undefined, (string | undefined)[]][] = [
    [loc.section, [ctx.section]],
    [loc.row, [ctx.row]],
    [loc.plot, [a?.plotLabel, position]],
  ];
  let compared = 0;
  let agreed = 0;
  for (const [want, have] of pairs) {
    const w = fold(want);
    const h = have.map(fold).filter(Boolean);
    if (!w || h.length === 0) continue;
    compared++;
    if (h.includes(w)) agreed++;
  }
  return compared === 0 ? undefined : agreed / compared;
}

function inscriptionNameScore(r: Person, stone: Monument): number {
  const words = new Set(
    `${stone.inscription?.text ?? ''} ${stone.epitaph ?? ''}`.split(/[^\p{L}\p{N}]+/u).map(fold),
  );
  const surname = fold(r.name.surname);
  if (!surname || !words.has(surname)) return 0;
  return words.has(firstGiven(r.name)) ? 0.9 : 0.6;
}

/** One record against one stone. */
export function scoreStone(record: Person, ctx: StoneContext): MatchCandidate {
  const place = placeScore(indexLocation(record), ctx);
  let best: { person: Person | undefined; name: number; date: number | undefined } = {
    person: undefined,
    name: inscriptionNameScore(record, ctx.stone),
    date: undefined,
  };
  for (const p of ctx.people) {
    const name = nameScore(record.name, p.name);
    const date = dateScore(record, p);
    const value = name + (date ?? 0) * 0.5;
    if (value > best.name + (best.date ?? 0) * 0.5) best = { person: p, name, date };
  }
  // Weighted over what can be compared; a date conflict sinks it.
  let sum = 0.55 * best.name;
  let weight = 0.55;
  if (best.date !== undefined) {
    sum += 0.25 * Math.max(0, best.date);
    weight += 0.25;
  }
  if (place !== undefined) {
    sum += 0.2 * place;
    weight += 0.2;
  }
  let score = sum / weight;
  if (best.date !== undefined && best.date < 0) score *= 0.3;
  // A name that doesn't agree can't be made a match by place alone.
  if (best.name < 0.3) score = Math.min(score, 0.3);
  return {
    stone: ctx.stone,
    person: best.name >= 0.3 ? best.person : undefined,
    score,
    reasons: { name: best.name, date: best.date, place },
  };
}

/** Score at or above which a stone is offered as a likely match. */
export const LIKELY_MATCH = 0.45;

/** Likely stones for a record, best first. */
export function rankStones(
  record: Person,
  stones: readonly StoneContext[],
  limit = 5,
): MatchCandidate[] {
  return stones
    .filter((c) => !c.stone.deleted)
    .map((c) => scoreStone(record, c))
    .filter((c) => c.score >= LIKELY_MATCH)
    .sort((a, b) => b.score - a.score || a.stone.id.localeCompare(b.stone.id))
    .slice(0, limit);
}

/** Whether a person came from an imported index. */
export function isIndexRecord(p: Pick<Person, 'sources'>): boolean {
  return !!p.sources?.some((s) => s.kind === 'imported-index');
}
