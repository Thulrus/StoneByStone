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

/** Carved symbols (plan §10.4). Anything else is stored as the text typed. */
export const SYMBOLS = [
  'willow-urn',
  'urn',
  'draped-urn',
  'willow',
  'deaths-head',
  'soul-effigy',
  'cherub',
  'lamb',
  'dove',
  'clasped-hands',
  'hand-up',
  'hand-down',
  'broken-column',
  'rose',
  'ihs',
  'cross',
  'star-of-david',
  'masonic',
  'odd-fellows',
  'woodmen',
  'gar',
] as const;

/** Inscription languages offered first (BCP 47); any other tag can be stored. */
export const INSCRIPTION_LANGUAGES = [
  'en',
  'de',
  'nl',
  'fr',
  'es',
  'it',
  'sv',
  'nb',
  'da',
  'fi',
  'pl',
  'cs',
  'cy',
  'gd',
  'ga',
  'la',
  'he',
  'yi',
] as const;

/** Scripts offered (ISO 15924). Fraktur (`Latf`) is common on German stones. */
export const INSCRIPTION_SCRIPTS = [
  'Latn',
  'Latf',
  'Hebr',
  'Cyrl',
  'Grek',
  'Arab',
  'Hani',
] as const;
export const FRAKTUR = 'Latf';

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
