import { describe, expect, it } from 'vitest';
import {
  HybridClock,
  MAX_COUNTER,
  compareHlc,
  formatHlc,
  isHlc,
  maxHlc,
  parseHlc,
  receive,
  tick,
} from './hlc';
import { generateNodeId, isUuid, uuidv7, uuidv7Time } from './id';

const A = 'aaaaaaaaaaaaaaaa';
const B = 'bbbbbbbbbbbbbbbb';

function fakeClock(start: number) {
  let t = start;
  return {
    now: () => t,
    set: (v: number) => {
      t = v;
    },
  };
}

describe('HLC format', () => {
  it('round-trips and is fixed width', () => {
    const s = formatHlc({ wall: 1700000000000, counter: 7, node: A });
    expect(s).toBe(`001700000000000-00007-${A}`);
    expect(parseHlc(s)).toEqual({ wall: 1700000000000, counter: 7, node: A });
    expect(isHlc(s)).toBe(true);
    expect(isHlc('1700000000000-7-a')).toBe(false);
  });

  it('rejects bad parts', () => {
    expect(() => formatHlc({ wall: -1, counter: 0, node: A })).toThrow(RangeError);
    expect(() => formatHlc({ wall: 1, counter: MAX_COUNTER + 1, node: A })).toThrow(RangeError);
    expect(() => formatHlc({ wall: 1, counter: 0, node: 'XYZ' })).toThrow(RangeError);
    expect(() => parseHlc('nope')).toThrow(SyntaxError);
  });

  it('orders lexically as (wall, counter, node)', () => {
    const list = [
      formatHlc({ wall: 10, counter: 0, node: B }),
      formatHlc({ wall: 9, counter: 99, node: B }),
      formatHlc({ wall: 10, counter: 0, node: A }),
      formatHlc({ wall: 10, counter: 1, node: A }),
      formatHlc({ wall: 100, counter: 0, node: A }),
    ];
    const sorted = [...list].sort();
    expect(sorted.map((h) => parseHlc(h))).toEqual([
      { wall: 9, counter: 99, node: B },
      { wall: 10, counter: 0, node: A },
      { wall: 10, counter: 0, node: B },
      { wall: 10, counter: 1, node: A },
      { wall: 100, counter: 0, node: A },
    ]);
    expect(compareHlc(list[0]!, list[2]!)).toBe(1);
    expect(compareHlc(list[2]!, list[2]!)).toBe(0);
    expect(maxHlc(list[1], undefined)).toBe(list[1]);
    expect(maxHlc(list[1]!, list[4]!)).toBe(list[4]);
  });
});

describe('HLC counter', () => {
  it('uses the wall clock when it moves forward', () => {
    expect(tick({ wall: 5, counter: 3 }, 9)).toEqual({ wall: 9, counter: 0 });
  });

  it('counts up within one millisecond', () => {
    const c = fakeClock(1000);
    const clock = new HybridClock(A, undefined, c.now);
    const stamps = [clock.now(), clock.now(), clock.now()];
    expect(stamps.map((s) => parseHlc(s).counter)).toEqual([0, 1, 2]);
    expect([...stamps].sort()).toEqual(stamps);
  });

  it('rolls into the next millisecond when the counter is full', () => {
    expect(tick({ wall: 5, counter: MAX_COUNTER }, 5)).toEqual({ wall: 6, counter: 0 });
  });
});

describe('HLC clock skew', () => {
  it('stays monotonic when the wall clock goes backwards', () => {
    const c = fakeClock(5000);
    const clock = new HybridClock(A, undefined, c.now);
    const first = clock.now();
    c.set(1000); // NTP correction, manual change, ...
    const second = clock.now();
    expect(second > first).toBe(true);
    expect(parseHlc(second)).toEqual({ wall: 5000, counter: 1, node: A });
  });

  it('jumps past a remote clock that is ahead', () => {
    const c = fakeClock(1000);
    const clock = new HybridClock(A, undefined, c.now);
    const remote = formatHlc({ wall: 9_000_000, counter: 4, node: B });
    clock.receive(remote);
    const next = clock.now();
    expect(next > remote).toBe(true);
    expect(parseHlc(next)).toEqual({ wall: 9_000_000, counter: 6, node: A });
  });

  it('ignores a remote clock that is behind, but still advances', () => {
    const s = receive(
      { wall: 500, counter: 2 },
      formatHlc({ wall: 100, counter: 9, node: B }),
      300,
    );
    expect(s).toEqual({ wall: 500, counter: 3 });
  });

  it('takes the max counter when local and remote share a wall time', () => {
    const s = receive({ wall: 500, counter: 2 }, formatHlc({ wall: 500, counter: 9, node: B }), 10);
    expect(s).toEqual({ wall: 500, counter: 10 });
  });

  it('resets the counter when the physical clock is ahead of both', () => {
    const s = receive(
      { wall: 500, counter: 2 },
      formatHlc({ wall: 400, counter: 9, node: B }),
      900,
    );
    expect(s).toEqual({ wall: 900, counter: 0 });
  });

  it('orders causally across two skewed devices', () => {
    const ca = fakeClock(10_000); // A is 9 s fast
    const cb = fakeClock(1_000);
    const a = new HybridClock(A, undefined, ca.now);
    const b = new HybridClock(B, undefined, cb.now);
    const e1 = a.now();
    b.receive(e1);
    const e2 = b.now(); // happened after e1 even though B's clock is far behind
    a.receive(e2);
    const e3 = a.now();
    expect([e3, e1, e2].sort()).toEqual([e1, e2, e3]);
  });

  it('rejects an invalid node id', () => {
    expect(() => new HybridClock('nope')).toThrow(RangeError);
  });
});

describe('IDs', () => {
  it('generates RFC 9562 UUIDv7s with the timestamp up front', () => {
    const id = uuidv7(1_700_000_000_123);
    expect(isUuid(id)).toBe(true);
    expect(id[14]).toBe('7');
    expect('89ab').toContain(id[19]);
    expect(uuidv7Time(id)).toBe(1_700_000_000_123);
    expect(uuidv7(1) < uuidv7(2)).toBe(true);
    expect(new Set(Array.from({ length: 1000 }, () => uuidv7(5))).size).toBe(1000);
  });

  it('generates 64-bit hex node ids', () => {
    const n = generateNodeId();
    expect(n).toMatch(/^[0-9a-f]{16}$/);
    expect(generateNodeId()).not.toBe(n);
    expect(() => new HybridClock(n)).not.toThrow();
  });
});
