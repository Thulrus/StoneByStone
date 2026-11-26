/**
 * Given-name abbreviations common on 18th–19th c. stones (plan §10.2). Used for search only;
 * display always keeps what was carved. Keys are lowercase without punctuation.
 * Forms that are also real names or nicknames (Eliza, Jon, Sam, Fred, Phil, ...) or that
 * collide with titles (Hon.) are deliberately absent.
 */
export const GIVEN_ABBREVIATIONS: Readonly<Record<string, string>> = {
  abm: 'Abraham',
  abr: 'Abraham',
  abrm: 'Abraham',
  alexr: 'Alexander',
  alexdr: 'Alexander',
  andw: 'Andrew',
  anth: 'Anthony',
  antho: 'Anthony',
  benj: 'Benjamin',
  benja: 'Benjamin',
  benjn: 'Benjamin',
  cath: 'Catherine',
  cathe: 'Catherine',
  chas: 'Charles',
  chs: 'Charles',
  christr: 'Christopher',
  xpher: 'Christopher',
  xr: 'Christopher',
  danl: 'Daniel',
  ebenr: 'Ebenezer',
  edw: 'Edward',
  edwd: 'Edward',
  eliz: 'Elizabeth',
  elizab: 'Elizabeth',
  elizh: 'Elizabeth',
  elizth: 'Elizabeth',
  ezek: 'Ezekiel',
  fredk: 'Frederick',
  geo: 'George',
  hy: 'Henry',
  isc: 'Isaac',
  jas: 'James',
  jno: 'John',
  jona: 'Jonathan',
  jonth: 'Jonathan',
  jos: 'Joseph',
  josh: 'Joshua',
  marg: 'Margaret',
  margt: 'Margaret',
  mathw: 'Matthew',
  michl: 'Michael',
  nath: 'Nathaniel',
  nathl: 'Nathaniel',
  natl: 'Nathaniel',
  patk: 'Patrick',
  richd: 'Richard',
  robt: 'Robert',
  saml: 'Samuel',
  sml: 'Samuel',
  stepn: 'Stephen',
  susna: 'Susanna',
  thos: 'Thomas',
  tho: 'Thomas',
  timo: 'Timothy',
  wm: 'William',
  wilm: 'William',
  willm: 'William',
  zach: 'Zachariah',
  zech: 'Zechariah',
};

function key(token: string): string {
  return token
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[.:'’^]/g, '');
}

/** Full form of a carved abbreviation (`Wm.` -> `William`), or undefined. */
export function expandAbbreviation(token: string): string | undefined {
  return GIVEN_ABBREVIATIONS[key(token)];
}

/** Expand every abbreviated word in a given-name string, for search keys. */
export function expandGivenNames(given: string): string {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => expandAbbreviation(t) ?? t)
    .join(' ');
}
