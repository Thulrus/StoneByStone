/**
 * The "before you go out" checklist (plan §8): each item from real device and survey state.
 * Pure, so the rules are tested; `FieldChecklist` gathers the state.
 */
export type CheckStatus = 'ok' | 'warn' | 'unknown';

export interface FieldState {
  /** `undefined`: this browser can't tell (Safari, Firefox). */
  battery?: { level: number; charging: boolean } | undefined;
  /** Bytes the browser will still let us store. */
  freeBytes?: number | undefined;
  persisted?: boolean | undefined;
  tiles: { allowed: boolean; count: number } | undefined;
  rows: { total: number; withLine: number };
}

export interface CheckItem {
  id: 'battery' | 'storage' | 'tiles' | 'persisted' | 'rows';
  status: CheckStatus;
}

/** Enough room for a long day: ~1,000 photos at the default size. */
export const MIN_FREE_BYTES = 500 * 1000 * 1000;
export const MIN_BATTERY = 0.5;

export function fieldChecklist(s: FieldState): CheckItem[] {
  const battery: CheckStatus = !s.battery
    ? 'unknown'
    : s.battery.charging || s.battery.level >= MIN_BATTERY
      ? 'ok'
      : 'warn';
  const storage: CheckStatus =
    s.freeBytes === undefined ? 'unknown' : s.freeBytes >= MIN_FREE_BYTES ? 'ok' : 'warn';
  // Imagery that can't be saved isn't a failure: the diagram works offline.
  const tiles: CheckStatus = !s.tiles
    ? 'unknown'
    : !s.tiles.allowed
      ? 'unknown'
      : s.tiles.count > 0
        ? 'ok'
        : 'warn';
  const persisted: CheckStatus =
    s.persisted === undefined ? 'unknown' : s.persisted ? 'ok' : 'warn';
  const rows: CheckStatus = s.rows.total > 0 ? 'ok' : 'warn';
  return [
    { id: 'battery', status: battery },
    { id: 'storage', status: storage },
    { id: 'tiles', status: tiles },
    { id: 'persisted', status: persisted },
    { id: 'rows', status: rows },
  ];
}
