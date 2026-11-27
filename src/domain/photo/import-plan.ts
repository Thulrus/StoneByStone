/**
 * Bulk photo import (plan §20.3): photos from an ordinary camera app become stones, ordered
 * by the time in their EXIF data and placed by its GPS. Pure: this decides the order and which
 * photos belong to one stone.
 */

export interface Shot {
  /** File name; orders shots that carry no time. */
  name: string;
  /** ISO 8601, from EXIF. */
  takenAt?: string;
  gps?: { lat: number; lng: number };
  sha256: string;
}

export interface PhotoPlanOptions {
  /**
   * Shots taken within this many seconds of a stone's first shot (and close to the one before
   * when both have GPS) are that stone: a front, then a back or a detail. Measured from the
   * first shot, so a steady walk of one shot per stone never chains into one stone. 0 makes
   * every shot its own stone.
   */
  groupSeconds: number;
  /** Photos already in the cemetery, by sha256; they are skipped. */
  existing?: ReadonlySet<string>;
}

export interface PhotoPlan<T extends Shot> {
  /** One entry per stone, each its shots in time order; stones in time order. */
  stones: T[][];
  /** Shots already in the cemetery, or repeated in this batch. */
  duplicates: T[];
}

/** Shots further apart than this (metres) are never one stone. */
export const SAME_STONE_M = 8;

const ms = (s: Shot) => (s.takenAt ? Date.parse(s.takenAt) : NaN);

function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const kx = 111_320 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  return Math.hypot((a.lng - b.lng) * kx, (a.lat - b.lat) * 110_574);
}

const byName = new Intl.Collator(undefined, { numeric: true });

/** Shots in time order (those with no time after, by file name), grouped into stones. */
export function planPhotoStones<T extends Shot>(
  shots: readonly T[],
  { groupSeconds, existing = new Set() }: PhotoPlanOptions,
): PhotoPlan<T> {
  const seen = new Set(existing);
  const duplicates: T[] = [];
  const fresh: T[] = [];
  for (const s of shots) {
    if (seen.has(s.sha256)) duplicates.push(s);
    else {
      seen.add(s.sha256);
      fresh.push(s);
    }
  }
  const sorted = fresh
    .map((s) => ({ s, t: ms(s) }))
    .sort((a, b) => {
      const at = Number.isNaN(a.t);
      const bt = Number.isNaN(b.t);
      if (at !== bt) return at ? 1 : -1;
      return (at ? 0 : a.t - b.t) || byName.compare(a.s.name, b.s.name);
    });
  const stones: T[][] = [];
  let prev: { s: T; t: number } | undefined;
  let start = NaN;
  for (const cur of sorted) {
    const last = stones.at(-1);
    const together =
      last &&
      prev &&
      groupSeconds > 0 &&
      !Number.isNaN(cur.t) &&
      !Number.isNaN(start) &&
      cur.t - start <= groupSeconds * 1000 &&
      (!cur.s.gps || !prev.s.gps || metres(cur.s.gps, prev.s.gps) <= SAME_STONE_M);
    if (together) last.push(cur.s);
    else {
      stones.push([cur.s]);
      start = cur.t;
    }
    prev = cur;
  }
  return { stones, duplicates };
}
