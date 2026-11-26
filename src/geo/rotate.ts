/** Map rotation helpers (plan §7.1): turn the map so rows run horizontally on screen. */
import { at, bearingDeg, normalizeDeg, type LngLatTuple } from './local';

/**
 * The map bearing that puts the row from its first to last point horizontal on screen.
 * Of the two candidates (row pointing right or left) it picks the one closest to
 * `currentBearing`, so the map turns as little as possible.
 */
export function rowsHorizontalBearing(line: readonly LngLatTuple[], currentBearing = 0): number {
  if (line.length < 2) return normalizeDeg(currentBearing);
  return horizontalBearingFor(bearingDeg(at(line, 0), at(line, line.length - 1)), currentBearing);
}

/** As `rowsHorizontalBearing`, for a row axis given as a bearing in degrees. */
export function horizontalBearingFor(b: number, currentBearing = 0): number {
  const right = normalizeDeg(b - 90);
  const left = normalizeDeg(b + 90);
  const turn = (x: number) => Math.abs(normalizeDeg(x - currentBearing));
  return turn(right) <= turn(left) ? right : left;
}

/** Mean direction of several rows, with opposite directions treated as the same axis. */
export function meanAxisBearing(lines: readonly (readonly LngLatTuple[])[]): number | undefined {
  let sx = 0;
  let sy = 0;
  for (const l of lines) {
    if (l.length < 2) continue;
    const r = (bearingDeg(at(l, 0), at(l, l.length - 1)) * Math.PI) / 90; // doubled angle
    sx += Math.cos(r);
    sy += Math.sin(r);
  }
  if (sx === 0 && sy === 0) return undefined;
  return normalizeDeg((Math.atan2(sy, sx) * 90) / Math.PI);
}
