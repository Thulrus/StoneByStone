/**
 * Burial-index CSV → Person records (plan §11 "Import existing indexes"). Pure: a column
 * mapping says what each column holds; `guessMapping` proposes one from the header row;
 * `indexRowsToPeople` builds people with `source: imported-index`, no stone and
 * `matchStatus: 'unmatched'`, ready for the Match view.
 */
import {
  calculateBirth,
  parseAge,
  parseDate,
  parseName,
  type FuzzyDate,
  type Person,
  type PersonName,
  type SourceLocation,
} from '../../domain';
import type { NewRecord } from '../repository';

export const INDEX_FIELDS = [
  'ignore',
  'fullName',
  'prefix',
  'given',
  'middle',
  'surname',
  'birthSurname',
  'suffix',
  'birth',
  'death',
  'burial',
  'age',
  'sex',
  'relationship',
  'section',
  'row',
  'plot',
  'military',
  'occupation',
  'notes',
  'ref',
] as const;

export type IndexField = (typeof INDEX_FIELDS)[number];

/** What each column holds, by column position. */
export type ColumnMapping = IndexField[];

export interface IndexPreset {
  name: string;
  /** Field per header (folded), so a preset fits the same export with columns moved. */
  byHeader: Record<string, IndexField>;
  hasHeader: boolean;
  /** Numeric date order of the source (`en-US` → 3/4/1890 is March 4). */
  dateLocale: string;
}

/** Lowercase letters and digits only: "Last Name" → "lastname", "D.O.B." → "dob". */
export function foldHeader(h: string): string {
  return h
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

// Checked in order; the first pattern that matches a folded header wins.
const GUESSES: [RegExp, IndexField][] = [
  [/^(maiden|birthsurname|birthname|nee|maidenname)/, 'birthSurname'],
  [/^(lastname|surname|familyname|last)$/, 'surname'],
  [/^(firstname|givenname|givennames|first|forename|forenames|given)$/, 'given'],
  [/^(middlename|middle|middlenames|mi|middleinitial)$/, 'middle'],
  [/^(title|prefix|honorific)$/, 'prefix'],
  [/^(suffix|jrsr)$/, 'suffix'],
  [/^(name|fullname|names|decedent|deceased|person)$/, 'fullName'],
  [/(birth|born|dob|bdate)/, 'birth'],
  [/(burial|buried|interment|interred)(date)?$/, 'burial'],
  [/(death|died|dod|ddate|deceaseddate)/, 'death'],
  [/^(age|ageatdeath|aged)/, 'age'],
  [/^(sex|gender)$/, 'sex'],
  [/(relationship|relation|spouse|wifeof|sonof|daughterof|parents)/, 'relationship'],
  [/^(section|sec|block|area)$/, 'section'],
  [/^(row|tier|range)$/, 'row'],
  [/^(plot|lot|grave|gravenumber|graveno|plotnumber|lotnumber|site|space)$/, 'plot'],
  [/(veteran|military|war|service|regiment|unit)/, 'military'],
  [/^(occupation|trade|profession)$/, 'occupation'],
  [/(note|remark|comment|inscription|epitaph|description)/, 'notes'],
  [/^(id|recordid|record|recordnumber|recno|no|number|ref|reference|entry)$/, 'ref'],
];

/** A field for each column from its header; unknown columns are ignored. */
export function guessMapping(headers: readonly string[]): ColumnMapping {
  const used = new Set<IndexField>();
  return headers.map((h) => {
    const f = foldHeader(h);
    const hit = GUESSES.find(([re, field]) => re.test(f) && !used.has(field));
    if (!hit) return 'ignore';
    // Several "notes" columns can all go to notes; anything else is one column each.
    if (hit[1] !== 'notes') used.add(hit[1]);
    return hit[1];
  });
}

/** A preset's mapping for these headers (headers it doesn't know are ignored). */
export function mappingFromPreset(preset: IndexPreset, headers: readonly string[]): ColumnMapping {
  return headers.map((h) => preset.byHeader[foldHeader(h)] ?? 'ignore');
}

export function presetFromMapping(
  name: string,
  headers: readonly string[],
  mapping: ColumnMapping,
  hasHeader: boolean,
  dateLocale: string,
): IndexPreset {
  const byHeader: Record<string, IndexField> = {};
  headers.forEach((h, i) => {
    const f = mapping[i];
    if (f && f !== 'ignore' && foldHeader(h)) byHeader[foldHeader(h)] = f;
  });
  return { name, byHeader, hasHeader, dateLocale };
}

export interface IndexImportOptions {
  cemeteryId: string;
  /** File name, for each person's source `ref` ("burials.csv, line 12"). */
  fileName: string;
  dateLocale: string;
  /** Line number of the first data row in the file (2 when there is a header). */
  firstLine: number;
}

export type NewPerson = NewRecord<Person> & { cemeteryId: string };

export interface IndexImportResult {
  people: NewPerson[];
  /** File line numbers of rows with no name, which were left out. */
  skipped: number[];
}

const SEX: Record<string, 'f' | 'm'> = {
  f: 'f', female: 'f', w: 'f', woman: 'f', fem: 'f',
  m: 'm', male: 'm', man: 'm',
}; // prettier-ignore

/** Turn mapped rows into people. A row with no name at all is skipped. */
export function indexRowsToPeople(
  rows: readonly (readonly string[])[],
  mapping: ColumnMapping,
  opts: IndexImportOptions,
): IndexImportResult {
  const people: NewPerson[] = [];
  const skipped: number[] = [];
  rows.forEach((row, i) => {
    const line = opts.firstLine + i;
    const all = (field: IndexField) =>
      mapping.map((f, c) => (f === field ? (row[c] ?? '').trim() : '')).filter(Boolean);
    const one = (field: IndexField) => all(field).join(' ').replace(/\s+/g, ' ');

    const name = buildName(one);
    if (!name) {
      skipped.push(line);
      return;
    }
    const date = (field: IndexField): FuzzyDate | undefined => {
      const v = one(field);
      return v ? parseDate(v, { dateLocale: opts.dateLocale }) : undefined;
    };
    const death = date('death');
    const burial = date('burial');
    const ageText = one('age');
    const age = ageText ? parseAge(ageText) : undefined;
    const birth = date('birth') ?? (death && age ? calculateBirth(death, age) : undefined);
    const sex = SEX[one('sex').toLowerCase().replace(/\.$/, '')];
    const location: SourceLocation = {};
    for (const k of ['section', 'row', 'plot'] as const) {
      const v = one(k);
      if (v) location[k] = v;
    }
    const military = one('military');
    const notes = all('notes').join('\n');
    const ref = one('ref');

    people.push({
      cemeteryId: opts.cemeteryId,
      name,
      ...(sex ? { sex } : {}),
      ...(birth ? { birth } : {}),
      ...(death ? { death } : {}),
      ...(burial ? { burial } : {}),
      ...(age ? { age } : {}),
      ...(one('relationship') ? { relationshipText: one('relationship') } : {}),
      ...(military ? { military: { conflict: military } } : {}),
      ...(one('occupation') ? { occupation: one('occupation') } : {}),
      ...(notes ? { notes } : {}),
      matchStatus: 'unmatched',
      sources: [
        {
          kind: 'imported-index',
          ref: ref ? `${opts.fileName}, ${ref}` : `${opts.fileName}, line ${line}`,
          ...(Object.keys(location).length > 0 ? { location } : {}),
        },
      ],
    });
  });
  return { people, skipped };
}

function buildName(one: (f: IndexField) => string): PersonName | undefined {
  const full = one('fullName');
  const parts = {
    prefix: one('prefix'),
    given: one('given'),
    middle: one('middle'),
    surname: one('surname'),
    birthSurname: one('birthSurname'),
    suffix: one('suffix'),
  };
  const anyPart = Object.values(parts).some(Boolean);
  if (!full && !anyPart) return undefined;
  // A full-name column is parsed; separate columns fill in or override its parts. No
  // `asCarved`: that is the spelling on a stone, and an index record has none (yet).
  const { asCarved: _, ...parsed } = full ? parseName(full) : {};
  const name: PersonName = parsed;
  for (const [k, v] of Object.entries(parts)) {
    if (v) (name as Record<string, string>)[k] = v;
  }
  return name;
}
