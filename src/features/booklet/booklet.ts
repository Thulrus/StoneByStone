/**
 * What the printable booklet (plan §13.1) lays out: the alphabetical index of people, the
 * stones grouped by section and row in walking order, and the plan map's geometry. Pure.
 */
import { flatStones, type FlatInput, type FlatStone } from '../../data/format/flat';
import type { Person } from '../../domain';
import { localProjection } from '../../geo';
import { compareByName } from '../people/search';

export interface IndexEntry {
  person: Person;
  /** The stone they are on, if any. */
  stone: FlatStone | undefined;
}

export interface RowGroup {
  /** e.g. "Section A, Row 3"; `undefined` for stones in no row. */
  section: string | undefined;
  row: string | undefined;
  stones: FlatStone[];
}

export interface Booklet {
  stones: FlatStone[];
  index: IndexEntry[];
  groups: RowGroup[];
  /** Number of live people. */
  people: number;
}

export function buildBooklet(input: FlatInput): Booklet {
  const stones = flatStones(input);
  const stoneOf = new Map(stones.map((f) => [f.stone.id, f]));
  const live = input.people.filter((p) => !p.deleted);
  const index = live
    .map((person) => ({
      person,
      stone: person.monumentId ? stoneOf.get(person.monumentId) : undefined,
    }))
    .sort((a, b) => compareByName(a.person, b.person));
  const groups: RowGroup[] = [];
  for (const f of stones) {
    const last = groups.at(-1);
    if (last && last.section === f.section && last.row === f.row) last.stones.push(f);
    else groups.push({ section: f.section, row: f.row, stones: [f] });
  }
  return { stones, index, groups, people: live.length };
}

/** Initial letter heading for the index ("#" for none). */
export function indexLetter(p: Person): string {
  const s = (p.name.surname ?? p.name.asCarved ?? p.name.given ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '');
  const c = s.trim().charAt(0).toUpperCase();
  return /\p{L}/u.test(c) ? c : '#';
}

export interface PlanPoint {
  id: string;
  x: number;
  y: number;
}

export interface PlanMap {
  width: number;
  height: number;
  points: PlanPoint[];
  /** Row lines and the boundary as SVG polyline points ("x,y x,y …"). */
  lines: string[];
  boundary: string[];
  /** Height of the band above the stones (north arrow) and below them (scale bar). */
  top: number;
  bottom: number;
  /** Length in SVG units of the scale bar, and the metres it stands for. */
  scale: { units: number; metres: number };
}

type LngLat = [number, number];

/**
 * A north-up plan of the stones (and row lines and boundary when given), in an SVG frame
 * `width` units wide with a 4 % margin. `undefined` when nothing is placed.
 */
export function planMap(
  points: readonly { id: string; lng: number; lat: number }[],
  lines: readonly (readonly LngLat[])[] = [],
  boundary: readonly (readonly LngLat[])[] = [],
  width = 1000,
): PlanMap | undefined {
  if (points.length === 0) return undefined;
  const all: LngLat[] = [
    ...points.map((p): LngLat => [p.lng, p.lat]),
    ...lines.flat(),
    ...boundary.flat(),
  ];
  const lng0 = all.reduce((s, p) => s + p[0], 0) / all.length;
  const lat0 = all.reduce((s, p) => s + p[1], 0) / all.length;
  const proj = localProjection([lng0, lat0]);
  const xy = (p: readonly [number, number]) => proj.toLocal([p[0], p[1]]);
  const local = all.map(xy);
  const xs = local.map((p) => p[0]);
  const ys = local.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanM = Math.max(maxX - minX, maxY - minY, 10);
  const margin = width * 0.04;
  // Bands above and below the stones for the north arrow and the scale bar.
  const top = width * 0.08;
  const bottom = width * 0.06;
  const k = (width - 2 * margin) / spanM;
  const height = Math.max(width * 0.4, (maxY - minY) * k + top + bottom);
  const toSvg = (p: readonly [number, number]) => {
    const [x, y] = xy(p);
    return [margin + (x - minX) * k, height - bottom - (y - minY) * k] as const;
  };
  const path = (ring: readonly LngLat[]) =>
    ring
      .map((p) =>
        toSvg(p)
          .map((v) => v.toFixed(1))
          .join(','),
      )
      .join(' ');
  // A round scale bar about a fifth of the width.
  const target = spanM / 5;
  const pow = 10 ** Math.floor(Math.log10(target));
  const metres =
    [1, 2, 5, 10]
      .map((m) => m * pow)
      .filter((m) => m <= target)
      .at(-1) ?? pow;
  return {
    width,
    height,
    top,
    bottom,
    points: points.map((p) => {
      const [x, y] = toSvg([p.lng, p.lat]);
      return { id: p.id, x, y };
    }),
    lines: lines.filter((l) => l.length > 1).map(path),
    boundary: boundary.filter((r) => r.length > 2).map(path),
    scale: { units: metres * k, metres },
  };
}
