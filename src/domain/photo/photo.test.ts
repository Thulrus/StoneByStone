import { describe, expect, test } from 'vitest';
import { exifTakenAt, readExif } from './exif';
import { hammingDistance, PHASH_SIZE, phash, rgbaToGray } from './phash';

type Value = { type: 2; text: string } | { type: 3 | 4; n: number } | { type: 5; r: number[][] };
interface Ifd {
  [tag: number]: Value | Ifd;
}

/** Build a JPEG with one Exif APP1 segment. Nested objects become sub-IFD pointers. */
function jpegWithExif(ifd0: Ifd, le = true): Uint8Array {
  const buf = new DataView(new ArrayBuffer(4096));
  let end = 8;
  const write = (ifd: Ifd): number => {
    const at = end;
    const tags = Object.keys(ifd)
      .map(Number)
      .sort((a, b) => a - b);
    end += 2 + tags.length * 12 + 4;
    buf.setUint16(at, tags.length, le);
    tags.forEach((tag, i) => {
      const e = at + 2 + i * 12;
      const v = ifd[tag]!;
      buf.setUint16(e, tag, le);
      if (!('type' in v)) {
        buf.setUint16(e + 2, 4, le);
        buf.setUint32(e + 4, 1, le);
        buf.setUint32(e + 8, write(v as Ifd), le);
        return;
      }
      buf.setUint16(e + 2, v.type, le);
      if (v.type === 2) {
        const bytes = [...v.text].map((c) => c.charCodeAt(0)).concat(0);
        buf.setUint32(e + 4, bytes.length, le);
        let p = e + 8;
        if (bytes.length > 4) {
          p = end;
          buf.setUint32(e + 8, p, le);
          end += bytes.length;
        }
        bytes.forEach((b, j) => buf.setUint8(p + j, b));
      } else if (v.type === 5) {
        buf.setUint32(e + 4, v.r.length, le);
        buf.setUint32(e + 8, end, le);
        for (const [n, d] of v.r) {
          buf.setUint32(end, n!, le);
          buf.setUint32(end + 4, d!, le);
          end += 8;
        }
      } else {
        buf.setUint32(e + 4, 1, le);
        if (v.type === 3) buf.setUint16(e + 8, v.n, le);
        else buf.setUint32(e + 8, v.n, le);
      }
    });
    return at;
  };
  buf.setUint16(0, le ? 0x4949 : 0x4d4d);
  buf.setUint16(2, 42, le);
  buf.setUint32(4, 8, le);
  write(ifd0);
  const tiff = new Uint8Array(buf.buffer, 0, end);
  const seg = 2 + 6 + tiff.length;
  const out = new Uint8Array(2 + 2 + seg + 2);
  out.set([0xff, 0xd8, 0xff, 0xe1, seg >> 8, seg & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  out.set(tiff, 12);
  out.set([0xff, 0xd9], 12 + tiff.length);
  return out;
}

const dms = (d: number, m: number, s100: number) => ({
  type: 5 as const,
  r: [
    [d, 1],
    [m, 1],
    [s100, 100],
  ],
});

describe('readExif', () => {
  const sample: Ifd = {
    0x0112: { type: 3, n: 6 },
    0x8769: {
      0x9003: { type: 2, text: '2026:05:01 14:03:22' },
      0x9011: { type: 2, text: '-04:00' },
    },
    0x8825: {
      1: { type: 2, text: 'N' },
      2: dms(44, 15, 3000),
      3: { type: 2, text: 'W' },
      4: dms(72, 34, 1500),
      0x1f: { type: 5, r: [[48, 10]] },
    },
  };

  test.each([true, false])('reads time, offset, GPS and orientation (little-endian %s)', (le) => {
    const e = readExif(jpegWithExif(sample, le));
    expect(e.localTime).toBe('2026-05-01T14:03:22');
    expect(e.offset).toBe('-04:00');
    expect(e.orientation).toBe(6);
    expect(e.lat).toBeCloseTo(44 + 15 / 60 + 30 / 3600, 9);
    expect(e.lng).toBeCloseTo(-(72 + 34 / 60 + 15 / 3600), 9);
    expect(e.accuracyM).toBeCloseTo(4.8);
  });

  test('falls back to IFD0 DateTime; ignores 0,0 GPS and zero dates', () => {
    expect(readExif(jpegWithExif({ 0x0132: { type: 2, text: '2001:02:03 04:05:06' } }))).toEqual({
      localTime: '2001-02-03T04:05:06',
    });
    const blank = jpegWithExif({
      0x0132: { type: 2, text: '0000:00:00 00:00:00' },
      0x8825: {
        1: { type: 2, text: 'N' },
        2: dms(0, 0, 0),
        3: { type: 2, text: 'E' },
        4: dms(0, 0, 0),
      },
    });
    expect(readExif(blank)).toEqual({});
  });

  test('never throws on junk', () => {
    expect(readExif(new Uint8Array())).toEqual({});
    expect(readExif(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 20, 0x45, 0x78]))).toEqual({});
    const truncated = jpegWithExif(sample).slice(0, 40);
    expect(() => readExif(truncated)).not.toThrow();
    for (let i = 0; i < 200; i++) {
      const junk = jpegWithExif(sample);
      junk[12 + ((i * 37) % (junk.length - 14))] = (i * 91) & 0xff;
      expect(() => readExif(junk)).not.toThrow();
    }
  });
});

describe('exifTakenAt', () => {
  test('uses the recorded offset', () => {
    expect(exifTakenAt({ localTime: '2026-05-01T14:03:22', offset: '-04:00' })).toBe(
      '2026-05-01T14:03:22-04:00',
    );
  });
  test('otherwise applies the given zone', () => {
    expect(exifTakenAt({ localTime: '2026-05-01T14:03:22' }, () => -240)).toBe(
      '2026-05-01T18:03:22.000Z',
    );
    expect(exifTakenAt({})).toBeUndefined();
  });
});

describe('phash', () => {
  const image = (f: (x: number, y: number) => number) => {
    const g = new Float64Array(PHASH_SIZE * PHASH_SIZE);
    for (let y = 0; y < PHASH_SIZE; y++)
      for (let x = 0; x < PHASH_SIZE; x++) g[y * PHASH_SIZE + x] = f(x, y);
    return g;
  };
  const stone = image((x, y) => ((x - 16) ** 2 + (y - 12) ** 2 < 80 ? 200 : 40 + x));

  test('is 16 hex chars and stable', () => {
    expect(phash(stone)).toMatch(/^[0-9a-f]{16}$/);
    expect(phash(stone)).toBe(phash(Float64Array.from(stone)));
  });

  test('survives brightness changes and mild noise, separates different images', () => {
    const brighter = stone.map((v) => v * 1.2 + 10);
    let seed = 1;
    const noisy = stone.map((v) => v + (((seed = (seed * 16807) % 2147483647) % 11) - 5));
    const other = image((x, y) => ((x * 7 + y * 3) % 32 < 16 ? 220 : 30));
    expect(hammingDistance(phash(stone), phash(brighter))).toBe(0);
    expect(hammingDistance(phash(stone), phash(noisy))).toBeLessThanOrEqual(6);
    expect(hammingDistance(phash(stone), phash(other))).toBeGreaterThan(16);
  });

  test('rgbaToGray', () => {
    expect([...rgbaToGray([255, 255, 255, 255, 0, 0, 0, 255])]).toEqual([255, 0]);
  });
});
