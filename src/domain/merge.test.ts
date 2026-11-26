import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from './canonical';
import { formatHlc } from './hlc';
import {
  type MergeableRecord,
  detectConflicts,
  mergeCollections,
  mergeRecords,
  normalizeRecord,
  updateLastSeen,
} from './merge';
import type { Stamp } from './types';

const NODES = ['aaaaaaaaaaaaaaaa', 'bbbbbbbbbbbbbbbb', 'cccccccccccccccc'];
const PEOPLE = ['u-alice', 'u-bob', 'u-cara'];

function hlc(wall: number, counter = 0, node = NODES[0] ?? ''): string {
  return formatHlc({ wall, counter, node });
}
function st(wall: number, by = PEOPLE[0] ?? '', node?: string): Stamp {
  return { hlc: hlc(wall, 0, node), by };
}

type Rec = MergeableRecord & Record<string, unknown>;

// Small pools so the generated records collide often.
const arbStamp: fc.Arbitrary<Stamp> = fc.record({
  hlc: fc
    .tuple(
      fc.integer({ min: 1, max: 4 }),
      fc.integer({ min: 0, max: 1 }),
      fc.constantFrom(...NODES),
    )
    .map(([w, c, n]) => hlc(w, c, n)),
  by: fc.constantFrom(...PEOPLE),
});

const FIELDS: Record<string, fc.Arbitrary<unknown>> = {
  notes: fc.constantFrom('a', 'b', 'c'),
  kind: fc.constantFrom('headstone', 'footstone'),
  tags: fc.array(fc.constantFrom('x', 'y'), { maxLength: 2 }),
  position: fc.record({ lng: fc.constantFrom(1, 2), lat: fc.constantFrom(3, 4) }),
  aliases: fc.uniqueArray(fc.constantFrom('id-1', 'id-2', 'id-3'), { maxLength: 3 }),
  sources: fc.array(
    fc.record({ kind: fc.constantFrom('stone', 'record'), ref: fc.constantFrom('p1', 'p2') }),
    { maxLength: 3 },
  ),
};

const arbRecord: fc.Arbitrary<Rec> = fc
  .record({
    values: fc.record(FIELDS, { requiredKeys: [] }),
    stamped: fc.subarray(Object.keys(FIELDS)),
    stamps: fc.array(arbStamp, { minLength: 6, maxLength: 6 }),
    deleted: fc.option(arbStamp, { nil: undefined }),
    createdAt: fc.integer({ min: 1, max: 4 }).map((w) => hlc(w)),
  })
  .map(({ values, stamped, stamps, deleted, createdAt }) => {
    const r: Rec = { id: 'rec-1', cemeteryId: 'cem-1', createdAt, stamps: {}, ...values };
    stamped.forEach((k, i) => {
      const s = stamps[i];
      if (s) r.stamps[k] = s;
    });
    if (deleted) r.deleted = deleted;
    return normalizeRecord(r);
  });

const eq = (x: unknown, y: unknown) => canonicalJson(x) === canonicalJson(y);

describe('mergeRecords properties', () => {
  it('is commutative', () => {
    fc.assert(
      fc.property(arbRecord, arbRecord, (a, b) => eq(mergeRecords(a, b), mergeRecords(b, a))),
      { numRuns: 2000 },
    );
  });

  it('is associative', () => {
    fc.assert(
      fc.property(arbRecord, arbRecord, arbRecord, (a, b, c) =>
        eq(mergeRecords(mergeRecords(a, b), c), mergeRecords(a, mergeRecords(b, c))),
      ),
      { numRuns: 2000 },
    );
  });

  it('is idempotent', () => {
    fc.assert(
      fc.property(arbRecord, (a) => eq(mergeRecords(a, a), a)),
      { numRuns: 1000 },
    );
    fc.assert(
      fc.property(arbRecord, arbRecord, (a, b) => {
        const m = mergeRecords(a, b);
        return eq(mergeRecords(m, b), m) && eq(mergeRecords(m, a), m);
      }),
      { numRuns: 1000 },
    );
  });

  it('collection merge is commutative and re-importing is a no-op', () => {
    const arbColl = fc.array(
      arbRecord.chain((r) => fc.constantFrom('r1', 'r2', 'r3').map((id) => ({ ...r, id }))),
      { maxLength: 4 },
    );
    fc.assert(
      fc.property(arbColl, arbColl, (a, b) => {
        const ab = mergeCollections(a, b);
        return eq(ab, mergeCollections(b, a)) && eq(mergeCollections(ab, b), ab);
      }),
      { numRuns: 500 },
    );
  });
});

describe('mergeRecords behaviour', () => {
  const base = { id: 'm1', cemeteryId: 'c1', createdAt: hlc(1) };

  it('keeps the newer value per field, independently', () => {
    const a: Rec = { ...base, notes: 'A', kind: 'ledger', stamps: { notes: st(5), kind: st(2) } };
    const b: Rec = {
      ...base,
      notes: 'B',
      kind: 'headstone',
      stamps: { notes: st(3), kind: st(4) },
    };
    const m = mergeRecords(a, b);
    expect(m.notes).toBe('A');
    expect(m.kind).toBe('headstone');
    expect(m.stamps).toEqual({ notes: st(5), kind: st(4) });
  });

  it('treats object fields as atomic', () => {
    const a: Rec = {
      ...base,
      position: { lng: 1, lat: 2, source: 'gps' },
      stamps: { position: st(5) },
    };
    const b: Rec = {
      ...base,
      position: { lng: 9, lat: 9, accuracyM: 3, source: 'map' },
      stamps: { position: st(4) },
    };
    expect(mergeRecords(a, b).position).toEqual({ lng: 1, lat: 2, source: 'gps' });
  });

  it('breaks equal-time ties by nodeId', () => {
    const a: Rec = { ...base, notes: 'A', stamps: { notes: st(5, 'u-alice', NODES[0]) } };
    const b: Rec = { ...base, notes: 'B', stamps: { notes: st(5, 'u-bob', NODES[1]) } };
    expect(mergeRecords(a, b).notes).toBe('B');
    expect(mergeRecords(b, a).notes).toBe('B');
  });

  it('lets a newer clear beat an older value', () => {
    const a: Rec = { ...base, stamps: { notes: st(6) } };
    const b: Rec = { ...base, notes: 'old', stamps: { notes: st(5) } };
    const m = mergeRecords(a, b);
    expect('notes' in m).toBe(false);
    expect(m.stamps.notes).toEqual(st(6));
  });

  it('unions aliases and sources', () => {
    const a: Rec = {
      ...base,
      aliases: ['z', 'x'],
      sources: [{ kind: 'stone' }],
      stamps: { aliases: st(1), sources: st(1) },
    };
    const b: Rec = {
      ...base,
      aliases: ['y', 'x'],
      sources: [{ kind: 'record', ref: 'census 1880' }, { kind: 'stone' }],
      stamps: { aliases: st(9), sources: st(2) },
    };
    const m = mergeRecords(a, b);
    expect(m.aliases).toEqual(['x', 'y', 'z'].map((s) => s));
    expect(m.sources).toHaveLength(2);
    expect(m.stamps.aliases).toEqual(st(9));
  });

  it('keeps the newest tombstone and the earliest createdAt', () => {
    const a: Rec = { ...base, createdAt: hlc(3), deleted: st(7), stamps: {} };
    const b: Rec = { ...base, createdAt: hlc(2), deleted: st(8), stamps: {} };
    const m = mergeRecords(a, b);
    expect(m.deleted).toEqual(st(8));
    expect(m.createdAt).toBe(hlc(2));
    expect(mergeRecords(a, { ...base, stamps: {} }).deleted).toEqual(st(7));
  });

  it('refuses different ids or cemeteries', () => {
    expect(() =>
      mergeRecords({ ...base, stamps: {} }, { ...base, id: 'm2', stamps: {} }),
    ).toThrow();
    expect(() =>
      mergeRecords({ ...base, stamps: {} }, { ...base, cemeteryId: 'c2', stamps: {} }),
    ).toThrow();
  });
});

describe('detectConflicts', () => {
  const base = { id: 'm1', cemeteryId: 'c1', createdAt: hlc(1) };
  const local: Rec = {
    ...base,
    notes: 'mine',
    kind: 'ledger',
    tags: ['a'],
    stamps: { notes: st(20, 'u-alice'), kind: st(20, 'u-alice'), tags: st(5, 'u-alice') },
  };
  const remote: Rec = {
    ...base,
    notes: 'theirs',
    kind: 'ledger',
    tags: ['b'],
    stamps: {
      notes: st(25, 'u-bob', NODES[1]),
      kind: st(25, 'u-bob', NODES[1]),
      tags: st(30, 'u-bob', NODES[1]),
    },
  };

  it('flags fields both sides changed since the last sync', () => {
    const c = detectConflicts(local, remote, { 'u-bob': hlc(10) });
    expect(c.map((x) => x.field)).toEqual(['notes']); // kind: same value; tags: local unchanged since sync
    expect(c[0]?.kept).toBe('remote');
  });

  it('flags every differing field when we never synced with that contributor', () => {
    expect(detectConflicts(local, remote, {}).map((x) => x.field)).toEqual(['notes', 'tags']);
  });

  it('ignores remote edits we already saw', () => {
    expect(detectConflicts(local, remote, { 'u-bob': hlc(40) })).toEqual([]);
  });

  it('tracks the max HLC per contributor', () => {
    const seen = updateLastSeen({ 'u-bob': hlc(26) }, remote);
    expect(seen).toEqual({ 'u-bob': formatHlc({ wall: 30, counter: 0, node: NODES[1] ?? '' }) });
    expect(updateLastSeen(seen, local)['u-alice']).toBe(hlc(20));
  });
});
