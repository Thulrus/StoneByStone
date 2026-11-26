/**
 * Walk-a-row positions (plan §7.2). Stones are slots `0…K-1` along a row line. Without GPS
 * they are spaced evenly from start to end. GPS fixes are projected onto the line and fitted
 * so distance along the line never decreases with `rowIndex` (weighted isotonic regression),
 * so GPS noise can't swap two stones. Stones without a fix are interpolated between their
 * neighbours. Missing indices are gaps and still take up a slot.
 */
import { lineLength, pointAlong, projectOntoLine } from './line';
import { distanceM, type LngLatTuple } from './local';

export interface RowFix {
  lng: number;
  lat: number;
  accuracyM?: number;
}

export interface RowSlot {
  index: number;
  /** Where the phone was when the stone was captured. */
  fix?: RowFix;
  /** Placed by hand (map, overlay, …): kept as is and used as a strong anchor. */
  placed?: RowFix;
}

export interface SlotPlacement {
  index: number;
  /** Metres from the row start. */
  along: number;
  point: [number, number];
  /** From the fix that anchored this slot, when there was one. */
  accuracyM?: number;
}

export interface LayoutOptions {
  /** Slots in the row; defaults to the highest index + 1. */
  slotCount?: number;
  /** Smallest distance kept between neighbouring slots, metres. */
  minGapM?: number;
}

/** Fixes this far off the line are treated as wrong (a different row, a bad fix). */
export const MAX_FIX_OFFSET_M = 25;
const DEFAULT_ACCURACY_M = 10;
const PLACED_WEIGHT = 1e6;

/** Pool-adjacent-violators: the non-decreasing sequence closest to `values` (weighted L2). */
export function isotonic(values: readonly number[], weights: readonly number[]): number[] {
  const blocks: { sum: number; w: number; n: number }[] = [];
  values.forEach((v, i) => {
    const w = weights[i] ?? 1;
    blocks.push({ sum: v * w, w, n: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1];
      const a = blocks[blocks.length - 2];
      if (!a || !b || a.sum / a.w <= b.sum / b.w) break;
      blocks.splice(blocks.length - 2, 2, { sum: a.sum + b.sum, w: a.w + b.w, n: a.n + b.n });
    }
  });
  return blocks.flatMap((b) => Array<number>(b.n).fill(b.sum / b.w));
}

const weightOf = (f: RowFix) => 1 / Math.max(1, f.accuracyM ?? DEFAULT_ACCURACY_M) ** 2;

/**
 * The line to lay a row out on: the drawn line, else start → end, else start → the fix
 * farthest from it. `undefined` when there's nothing to go on (name-only rows).
 */
export function effectiveRowLine(
  line: readonly LngLatTuple[] | undefined,
  start?: RowFix,
  end?: RowFix,
  fixes: readonly RowFix[] = [],
): [number, number][] | undefined {
  if (line && line.length >= 2) return line.map((p) => [p[0] as number, p[1] as number]);
  if (!start) return undefined;
  const a: [number, number] = [start.lng, start.lat];
  if (end) return [a, [end.lng, end.lat]];
  let far: RowFix | undefined;
  let farD = 1; // under a metre gives no usable direction
  for (const f of fixes) {
    const d = distanceM(a, [f.lng, f.lat]);
    if (d > farD) [far, farD] = [f, d];
  }
  return far ? [a, [far.lng, far.lat]] : undefined;
}

export function layoutRow(
  line: readonly LngLatTuple[],
  slots: readonly RowSlot[],
  { slotCount, minGapM = 0.5 }: LayoutOptions = {},
): SlotPlacement[] {
  if (slots.length === 0) return [];
  const length = lineLength(line);
  const k = Math.max(slotCount ?? 0, ...slots.map((s) => s.index + 1));

  // Anchors: projected fixes (and hand-placed stones), in index order.
  const anchors = slots
    .flatMap((s) => {
      const f = s.placed ?? s.fix;
      if (!f) return [];
      const p = projectOntoLine(line, [f.lng, f.lat]);
      if (!s.placed && Math.abs(p.offset) > MAX_FIX_OFFSET_M) return [];
      const w = s.placed ? PLACED_WEIGHT : weightOf(f);
      return [{ index: s.index, along: p.along, w, accuracyM: s.placed ? undefined : f.accuracyM }];
    })
    .sort((a, b) => a.index - b.index);
  const fitted = isotonic(
    anchors.map((a) => a.along),
    anchors.map((a) => a.w),
  );

  // Every slot 0…k-1: anchored, or linear between the anchors around it (row ends count).
  const known = new Map<number, number>();
  anchors.forEach((a, i) => known.set(a.index, fitted[i] ?? a.along));
  if (!known.has(0)) known.set(0, Math.min(0, ...known.values()));
  if (k > 1 && !known.has(k - 1)) known.set(k - 1, Math.max(length, ...known.values()));
  const keys = [...known.keys()].sort((a, b) => a - b);
  const along: number[] = [];
  let j = 0;
  for (let i = 0; i < k; i++) {
    while (j < keys.length - 2 && (keys[j + 1] ?? 0) <= i) j++;
    const i0 = keys[j] ?? 0;
    const i1 = keys[j + 1] ?? i0;
    const a0 = known.get(i0) ?? 0;
    const a1 = known.get(i1) ?? a0;
    along.push(known.get(i) ?? (i1 === i0 ? a0 : a0 + ((a1 - a0) * (i - i0)) / (i1 - i0)));
  }

  // Keep neighbours apart and inside the line, so no two stones sit on top of each other.
  const gap = k > 1 ? Math.min(minGapM, length / (k - 1)) : 0;
  for (let i = 0; i < k; i++) {
    const prev = i > 0 ? (along[i - 1] ?? 0) + gap : 0;
    along[i] = Math.max(prev, along[i] ?? 0);
  }
  for (let i = k - 1; i >= 0; i--) {
    const next = i < k - 1 ? (along[i + 1] ?? length) - gap : length;
    along[i] = Math.max(0, Math.min(next, along[i] ?? 0));
  }

  const accuracy = new Map(anchors.map((a) => [a.index, a.accuracyM]));
  return slots.map((s) => {
    const d = along[s.index] ?? 0;
    const out: SlotPlacement = { index: s.index, along: d, point: pointAlong(line, d) };
    const acc = accuracy.get(s.index);
    if (acc !== undefined) out.accuracyM = acc;
    return out;
  });
}
