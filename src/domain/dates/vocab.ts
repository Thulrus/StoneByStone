/**
 * Word lists for the FuzzyDate parser: month names (English with archaic carved forms, plus
 * the languages most common on immigrant stones), ordinal words and filler words.
 * All keys are lowercase with diacritics kept.
 */

const MONTH_FORMS: readonly string[] = [
  // 1 January
  'january jan jany janry janr janu januar jänner janvier enero januari gennaio januarii ianuarii',
  // 2 February
  'february feb feby febry febr febu febuary februar février fevrier febrero februari febbraio februarii',
  // 3 March
  'march mar mch marh märz maerz mars marzo maart marts martii',
  // 4 April
  'april apr aprl apl avril abril aprile aprilis',
  // 5 May
  'may mai mayo mei maj maggio maii',
  // 6 June
  'june jun jne juni juin junio giugno junii',
  // 7 July
  'july jul jly juli juillet julio luglio julii',
  // 8 August
  'august aug augt augst août aout agosto augustus augusti',
  // 9 September
  'september sep sept septr sepr septem septembre septiembre setiembre settembre septembris',
  // 10 October
  'october oct octr octo okt oktober octobre octubre ottobre octobris',
  // 11 November
  'november nov novr novem novembre noviembre novembris',
  // 12 December
  'december dec decr decem dez dezember décembre decembre diciembre dicembre decembris xber xbr',
];

export const MONTHS: ReadonlyMap<string, number> = new Map(
  MONTH_FORMS.flatMap((forms, i) => forms.split(' ').map((f) => [f, i + 1] as const)),
);

/** Canonical English abbreviations used by `formatDate`. */
export const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const UNIT_ORDINALS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
];
const TEEN_ORDINALS = [
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
];

/** "first" .. "thirty-first" (the parser joins "twenty" + "first"). */
export const ORDINAL_WORDS: ReadonlyMap<string, number> = new Map([
  ...UNIT_ORDINALS.map((w, i) => [w, i + 1] as const),
  ...TEEN_ORDINALS.map((w, i) => [w, i + 10] as const),
  ['twentieth', 20],
  ['thirtieth', 30],
]);

export const TENS_WORDS: ReadonlyMap<string, number> = new Map([
  ['twenty', 20],
  ['thirty', 30],
]);

export const UNIT_ORDINAL_VALUES: ReadonlyMap<string, number> = new Map(
  UNIT_ORDINALS.map((w, i) => [w, i + 1] as const),
);

/** Words that carry no date information. */
export const FILLER = new Set([
  'ye',
  'the',
  'of',
  'on',
  'day',
  'in',
  'year',
  'our',
  'lord',
  'anno',
  'domini',
  'dom',
  'this',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sabbath',
  // articles and prepositions in other languages: "le 3 février", "3 de mayo de 1890", "den 3. Mai"
  'le',
  'de',
  'del',
  'den',
  'der',
  'am',
  'il',
  'el',
  'op',
]);

/** Quaker-style "3rd mo." / "third month". */
export const MONTH_WORDS = new Set(['mo', 'mos', 'mon', 'month', 'mth']);

/** Relative months in letters and notices: this month, last month, next month. */
export const RELATIVE: ReadonlyMap<string, 'inst' | 'ult' | 'prox'> = new Map([
  ['inst', 'inst'],
  ['instant', 'inst'],
  ['ult', 'ult'],
  ['ulto', 'ult'],
  ['ultimo', 'ult'],
  ['prox', 'prox'],
  ['proximo', 'prox'],
]);
