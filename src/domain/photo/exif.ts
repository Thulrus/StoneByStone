/**
 * Minimal JPEG EXIF reader (plan §19 Photo): capture time, GPS position and orientation.
 * Reads only the APP1 segment; anything malformed yields an empty result, never a throw.
 */

export interface ExifData {
  /** `DateTimeOriginal` (or `DateTime`) as `YYYY-MM-DDTHH:MM:SS`, camera-local time. */
  localTime?: string;
  /** `OffsetTimeOriginal` as `±HH:MM`, when the camera recorded it. */
  offset?: string;
  lat?: number;
  lng?: number;
  /** `GPSHPositioningError`, metres. */
  accuracyM?: number;
  /** 1–8, TIFF orientation. */
  orientation?: number;
}

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

interface Entry {
  tag: number;
  type: number;
  count: number;
  /** Offset of the value (inline or pointed to) from the start of `view`. */
  at: number;
}

class Tiff {
  constructor(
    readonly view: DataView,
    readonly base: number,
    readonly le: boolean,
  ) {}

  u16(at: number) {
    return this.view.getUint16(at, this.le);
  }
  u32(at: number) {
    return this.view.getUint32(at, this.le);
  }

  ifd(offset: number): Map<number, Entry> {
    const out = new Map<number, Entry>();
    const start = this.base + offset;
    const n = this.u16(start);
    for (let i = 0; i < n; i++) {
      const e = start + 2 + i * 12;
      const type = this.u16(e + 2);
      const count = this.u32(e + 4);
      const size = (TYPE_SIZE[type] ?? 1) * count;
      const at = size <= 4 ? e + 8 : this.base + this.u32(e + 8);
      if (at + size > this.view.byteLength) continue;
      out.set(this.u16(e), { tag: this.u16(e), type, count, at });
    }
    return out;
  }

  ascii(e: Entry | undefined): string | undefined {
    if (!e || e.type !== 2) return undefined;
    let s = '';
    for (let i = 0; i < e.count; i++) {
      const c = this.view.getUint8(e.at + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s.trim() || undefined;
  }

  rationals(e: Entry | undefined): number[] | undefined {
    if (!e || (e.type !== 5 && e.type !== 10)) return undefined;
    const out: number[] = [];
    for (let i = 0; i < e.count; i++) {
      const at = e.at + i * 8;
      const num = e.type === 5 ? this.u32(at) : this.view.getInt32(at, this.le);
      const den = e.type === 5 ? this.u32(at + 4) : this.view.getInt32(at + 4, this.le);
      out.push(den === 0 ? NaN : num / den);
    }
    return out;
  }

  short(e: Entry | undefined): number | undefined {
    if (!e) return undefined;
    if (e.type === 3) return this.u16(e.at);
    if (e.type === 4) return this.u32(e.at);
    return undefined;
  }
}

/** Find the TIFF block inside a JPEG's `Exif` APP1 segment. */
function findTiff(bytes: Uint8Array): Tiff | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return undefined;
  let p = 2;
  while (p + 4 <= view.byteLength) {
    if (view.getUint8(p) !== 0xff) return undefined;
    const marker = view.getUint8(p + 1);
    if (marker === 0xda || marker === 0xd9) return undefined; // image data: no more headers
    const len = view.getUint16(p + 2);
    if (
      marker === 0xe1 &&
      p + 10 <= view.byteLength &&
      view.getUint32(p + 4) === 0x45786966 && // "Exif"
      view.getUint16(p + 8) === 0
    ) {
      const base = p + 10;
      if (base + 8 > view.byteLength) return undefined;
      const order = view.getUint16(base);
      if (order !== 0x4949 && order !== 0x4d4d) return undefined;
      return new Tiff(view, base, order === 0x4949);
    }
    p += 2 + len;
  }
  return undefined;
}

const DATE_RE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
const OFFSET_RE = /^[+-]\d{2}:\d{2}$/;

function degrees(dms: number[] | undefined, ref: string | undefined, neg: string) {
  const [d, m, s] = dms ?? [];
  if (d === undefined || m === undefined || s === undefined) return undefined;
  const v = d + m / 60 + s / 3600;
  if (!Number.isFinite(v)) return undefined;
  return ref?.toUpperCase() === neg ? -v : v;
}

export function readExif(bytes: Uint8Array): ExifData {
  try {
    const tiff = findTiff(bytes);
    if (!tiff) return {};
    const ifd0 = tiff.ifd(tiff.u32(tiff.base + 4));
    const out: ExifData = {};

    const orientation = tiff.short(ifd0.get(0x0112));
    if (orientation && orientation >= 1 && orientation <= 8) out.orientation = orientation;

    const exifPtr = tiff.short(ifd0.get(0x8769));
    const exif = exifPtr ? tiff.ifd(exifPtr) : new Map<number, Entry>();
    const raw = tiff.ascii(exif.get(0x9003)) ?? tiff.ascii(ifd0.get(0x0132));
    const m = raw && DATE_RE.exec(raw);
    if (m && m[1] !== '0000') out.localTime = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
    const offset = tiff.ascii(exif.get(0x9011));
    if (out.localTime && offset && OFFSET_RE.test(offset)) out.offset = offset;

    const gpsPtr = tiff.short(ifd0.get(0x8825));
    if (gpsPtr) {
      const gps = tiff.ifd(gpsPtr);
      const lat = degrees(tiff.rationals(gps.get(2)), tiff.ascii(gps.get(1)), 'S');
      const lng = degrees(tiff.rationals(gps.get(4)), tiff.ascii(gps.get(3)), 'W');
      const valid =
        lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
      // 0,0 is what some cameras write when they have no fix.
      if (valid && (lat !== 0 || lng !== 0)) {
        out.lat = lat;
        out.lng = lng;
        const err = tiff.rationals(gps.get(0x1f))?.[0];
        if (err !== undefined && Number.isFinite(err) && err > 0) out.accuracyM = err;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * ISO 8601 with an offset (the schema's `date-time`). Without a recorded offset the time is
 * taken as local to `zoneOf`, which defaults to this device's zone.
 */
export function exifTakenAt(
  exif: ExifData,
  zoneOf: (local: Date) => number = (d) => -d.getTimezoneOffset(),
): string | undefined {
  if (!exif.localTime) return undefined;
  if (exif.offset) {
    const iso = `${exif.localTime}${exif.offset}`;
    return Number.isNaN(Date.parse(iso)) ? undefined : iso;
  }
  const [y = NaN, mo = 1, d = 1, h = 0, mi = 0, s = 0] = exif.localTime.split(/[-T:]/).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  if (Number.isNaN(asUtc)) return undefined;
  const minutes = zoneOf(new Date(y, mo - 1, d, h, mi, s));
  return new Date(asUtc - minutes * 60_000).toISOString();
}
