/**
 * Quick capture vocabularies (plan §8, §10.4): stable ids stored on `Monument`. Labels are
 * translated in the UI (`features/stones/attribute-labels.ts`).
 */
export const MONUMENT_KINDS = [
  'headstone',
  'footstone',
  'tablet',
  'obelisk',
  'ledger',
  'table-tomb',
  'box-tomb',
  'cross',
  'flat-marker',
  'pedestal',
  'fieldstone',
  'government',
  'temporary',
  'fragment',
  'other',
] as const;

export const MATERIALS = [
  'marble',
  'granite',
  'slate',
  'sandstone',
  'brownstone',
  'limestone',
  'white-bronze',
  'cast-iron',
  'wood',
  'concrete',
  'fieldstone',
  'other',
] as const;

export const CONDITIONS = [
  'good',
  'weathered',
  'biological-growth',
  'cracked',
  'broken',
  'fallen',
  'sunken',
  'tilted',
  'illegible',
  'repaired',
  'missing',
] as const;

/** Flags offered in the field. Others (`illegible`, `relocated`) may be set at the desk. */
export const CAPTURE_FLAGS = ['needs-revisit', 'uncertain-position', 'veteran-marker'] as const;

export const DEFAULT_KIND = 'headstone';

/** Toggle `value` in a set-like list, keeping the vocabulary's order. */
export function toggleIn(
  list: readonly string[] | undefined,
  value: string,
  order: readonly string[],
): string[] {
  const set = new Set(list ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  const rank = (v: string) => {
    const i = order.indexOf(v);
    return i < 0 ? order.length : i;
  };
  return [...set].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
