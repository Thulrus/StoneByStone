import { expect, test } from 'vitest';
import type { ID, Monument, MonumentStatus, Row, Section, Stamp } from '../../domain';
import {
  buildProgress,
  donePercent,
  emptyCounts,
  percent,
  revisitList,
  STATUSES,
} from './progress';

const row = (id: string, sectionId?: string): Row => ({ id, label: id, sectionId }) as Row;
const section = (id: string): Section => ({ id, name: id }) as Section;
let n = 0;
const stone = (status: MonumentStatus, rowId?: string, over: Partial<Monument> = {}): Monument =>
  ({
    id: `m${String(++n).padStart(3, '0')}`,
    status,
    createdAt: String(n).padStart(4, '0'),
    ...(rowId ? { address: { rowId, rowIndex: n } } : {}),
    ...over,
  }) as Monument;

function layout(rows: Row[], sections: Section[]) {
  const by = new Map<ID | null, Row[]>([[null, []]]);
  for (const s of sections) by.set(s.id, []);
  for (const r of rows) by.get(r.sectionId ?? null)?.push(r);
  return by;
}

test('counts per row and section add up to the whole cemetery', () => {
  const sections = [section('S1'), section('S2')];
  const rows = [row('loose'), row('a', 'S1'), row('b', 'S1'), row('c', 'S2')];
  const stones = [
    stone('verified', 'a'),
    stone('transcribed', 'a'),
    stone('photographed', 'a'),
    stone('located', 'b'),
    stone('transcribed', 'c'),
    stone('photographed', 'loose'),
    stone('photographed'), // in no row
    stone('verified', 'gone'), // row deleted
    stone('verified', 'a', { deleted: {} as Stamp }),
  ];
  const p = buildProgress(stones, sections, layout(rows, sections));

  expect(p.counts).toEqual({
    total: 8,
    located: 1,
    photographed: 3,
    transcribed: 2,
    verified: 2,
  });
  expect(p.unplaced.total).toBe(2);
  expect(p.sections.map((s) => s.section?.id)).toEqual([undefined, 'S1', 'S2']);
  const s1 = p.sections[1];
  expect(s1?.counts).toEqual({
    total: 4,
    located: 1,
    photographed: 1,
    transcribed: 1,
    verified: 1,
  });
  expect(s1?.rows.map((r) => [r.row.id, r.counts.total])).toEqual([
    ['a', 3],
    ['b', 1],
  ]);

  // Every stone is counted exactly once: sections + unplaced = whole.
  const sum = emptyCounts();
  for (const c of [...p.sections.map((s) => s.counts), p.unplaced]) {
    for (const s of STATUSES) sum[s] += c[s];
    sum.total += c.total;
  }
  expect(sum).toEqual(p.counts);
});

test('a row with no stones shows zeros; no loose rows means no unsectioned group', () => {
  const sections = [section('S1')];
  const rows = [row('a', 'S1')];
  const p = buildProgress([], sections, layout(rows, sections));
  expect(p.sections).toHaveLength(1);
  expect(p.sections[0]?.rows[0]?.counts).toEqual(emptyCounts());
});

test('percentages round down so 100% means every stone', () => {
  const c = { total: 3, located: 0, photographed: 1, transcribed: 1, verified: 1 };
  expect(percent(c, 'verified')).toBe(33);
  expect(donePercent(c)).toBe(66);
  expect(donePercent({ ...c, photographed: 0, transcribed: 2 })).toBe(100);
  expect(donePercent(emptyCounts())).toBe(0);
  const almost = { total: 1000, located: 1, photographed: 0, transcribed: 999, verified: 0 };
  expect(donePercent(almost)).toBe(99);
});

test('the revisit list holds flagged live stones in walking order', () => {
  const rows = [row('A'), row('B')];
  const b = stone('located', 'B', { flags: ['needs-revisit'] });
  const a = stone('photographed', 'A', { flags: ['uncertain-position', 'needs-revisit'] });
  stone('photographed', 'A');
  const gone = stone('located', 'A', { flags: ['needs-revisit'], deleted: {} as Stamp });
  const other = stone('located', 'A', { flags: ['illegible'] });
  expect(revisitList([b, gone, other, a], rows).map((m) => m.id)).toEqual([a.id, b.id]);
});
