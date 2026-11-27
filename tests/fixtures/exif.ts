/**
 * Adds an Exif APP1 segment (time taken and GPS) to a JPEG, for photo-import tests. Plain
 * TypeScript with no app imports, so Playwright can use it.
 */

/** One rational (numerator, denominator) per degree/minute/second. */
const dms = (v: number): [number, number][] => {
  const a = Math.abs(v);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = Math.round(((a - d) * 60 - m) * 60 * 10_000);
  return [
    [d, 1],
    [m, 1],
    [s, 10_000],
  ];
};

export interface ExifInput {
  /** "2026:05:01 14:03:22" */
  dateTime: string;
  lat: number;
  lng: number;
}

/** A little-endian TIFF block: IFD0 → Exif IFD (DateTimeOriginal) and GPS IFD. */
function tiff({ dateTime, lat, lng }: ExifInput): Uint8Array {
  const b = new DataView(new ArrayBuffer(512));
  const le = true;
  b.setUint16(0, 0x4949);
  b.setUint16(2, 42, le);
  b.setUint32(4, 8, le);
  let end = 8;
  const entry = (at: number, tag: number, type: number, count: number, value: number) => {
    b.setUint16(at, tag, le);
    b.setUint16(at + 2, type, le);
    b.setUint32(at + 4, count, le);
    if (type === 3) b.setUint16(at + 8, value, le);
    else b.setUint32(at + 8, value, le);
  };
  const ifd = (n: number) => {
    const at = end;
    b.setUint16(at, n, le);
    end += 2 + n * 12 + 4;
    return at + 2;
  };
  const ascii = (text: string) => {
    const at = end;
    [...text].forEach((c, i) => b.setUint8(at + i, c.charCodeAt(0)));
    b.setUint8(at + text.length, 0);
    end += text.length + 1;
    return at;
  };
  const rationals = (rs: [number, number][]) => {
    const at = end;
    rs.forEach(([n, d], i) => {
      b.setUint32(at + i * 8, n, le);
      b.setUint32(at + i * 8 + 4, d, le);
    });
    end += rs.length * 8;
    return at;
  };
  const ifd0 = ifd(2);
  const exif = ifd(1);
  entry(ifd0, 0x8769, 4, 1, exif - 2);
  entry(exif, 0x9003, 2, dateTime.length + 1, ascii(dateTime));
  const gps = ifd(4);
  entry(ifd0 + 12, 0x8825, 4, 1, gps - 2);
  // Short ASCII values ("N\0") fit in the entry itself.
  b.setUint16(gps, 1, le);
  b.setUint16(gps + 2, 2, le);
  b.setUint32(gps + 4, 2, le);
  b.setUint8(gps + 8, (lat < 0 ? 'S' : 'N').charCodeAt(0));
  entry(gps + 12, 2, 5, 3, rationals(dms(lat)));
  b.setUint16(gps + 24, 3, le);
  b.setUint16(gps + 26, 2, le);
  b.setUint32(gps + 28, 2, le);
  b.setUint8(gps + 32, (lng < 0 ? 'W' : 'E').charCodeAt(0));
  entry(gps + 36, 4, 5, 3, rationals(dms(lng)));
  return new Uint8Array(b.buffer, 0, end);
}

/** `jpeg` with an Exif segment right after its start-of-image marker. */
export function withExif(jpeg: Uint8Array, exif: ExifInput): Uint8Array {
  const t = tiff(exif);
  const len = 2 + 6 + t.length;
  const seg = new Uint8Array(2 + len);
  seg.set([0xff, 0xe1, len >> 8, len & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0]);
  seg.set(t, 10);
  const out = new Uint8Array(jpeg.length + seg.length);
  out.set(jpeg.subarray(0, 2));
  out.set(seg, 2);
  out.set(jpeg.subarray(2), 2 + seg.length);
  return out;
}
