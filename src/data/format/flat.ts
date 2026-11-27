/**
 * Flat exports for other tools (plan §13.1): CSV for spreadsheets (one row per person, with
 * the stone's place and text), GeoJSON for GIS and KML for Google Earth (one point per placed
 * stone). Pure: they work from the records and return text.
 *
 * Column headers and property keys are fixed English, not translated, so a file reads the
 * same in every language and a spreadsheet made from it keeps working. The CSV headers are
 * ones the burial-index import recognises (`index-csv.ts`).
 */
import {
  formatDate,
  type Cemetery,
  type FuzzyDate,
  type ID,
  type Monument,
  type Person,
  type Row,
  type Section,
} from '../../domain';
import { csvLine } from './csv';

export interface FlatInput {
  cemetery: Cemetery;
  sections: readonly Section[];
  rows: readonly Row[];
  stones: readonly Monument[];
  people: readonly Person[];
}

/** One stone with everything the flat formats show about it. */
export interface FlatStone {
  stone: Monument;
  people: Person[];
  section: string | undefined;
  row: string | undefined;
  /** 1-based place in its row. */
  position: number | undefined;
}

const date = (d: FuzzyDate | undefined) => (d ? formatDate(d) : '');

/** A person's name as it reads in lists: as carved, else from its parts. */
export function flatName(p: Pick<Person, 'name'>): string {
  const n = p.name;
  return (
    n.asCarved?.trim() ||
    [n.prefix, n.given, n.middle, n.surname, n.suffix].filter(Boolean).join(' ') ||
    n.romanized ||
    ''
  );
}

/** Live stones with their people and place, in walking order (section, row, place in row). */
export function flatStones({ sections, rows, stones, people }: FlatInput): FlatStone[] {
  const sectionById = new Map(sections.filter((s) => !s.deleted).map((s) => [s.id, s]));
  const rowById = new Map(rows.filter((r) => !r.deleted).map((r) => [r.id, r]));
  const byStone = new Map<ID, Person[]>();
  for (const p of people) {
    if (p.deleted || !p.monumentId) continue;
    byStone.set(p.monumentId, [...(byStone.get(p.monumentId) ?? []), p]);
  }
  const out = stones
    .filter((m) => !m.deleted)
    .map((stone) => {
      const row = stone.address?.rowId ? rowById.get(stone.address.rowId) : undefined;
      const sectionId = stone.address?.sectionId ?? row?.sectionId;
      const section = sectionId ? sectionById.get(sectionId) : undefined;
      const index = row ? stone.address?.rowIndex : undefined;
      return {
        flat: {
          stone,
          people: byStone.get(stone.id) ?? [],
          section: section?.name,
          row: row?.label,
          position: index === undefined ? undefined : index + 1,
        },
        key: [section?.order ?? Infinity, row?.order ?? Infinity, index ?? Infinity] as const,
      };
    });
  out.sort(
    (a, b) =>
      a.key[0] - b.key[0] ||
      a.key[1] - b.key[1] ||
      (a.flat.section ?? '').localeCompare(b.flat.section ?? '') ||
      (a.flat.row ?? '').localeCompare(b.flat.row ?? '', undefined, { numeric: true }) ||
      a.key[2] - b.key[2] ||
      a.flat.stone.id.localeCompare(b.flat.stone.id),
  );
  return out.map((o) => o.flat);
}

const military = (p: Person) =>
  p.military
    ? [p.military.conflict, p.military.rank, p.military.unit, p.military.marker]
        .filter(Boolean)
        .join(', ') || 'yes'
    : '';

const ageText = (p: Person) => p.age?.original ?? '';
const list = (xs: readonly string[] | undefined) => (xs ?? []).join('; ');
const indexRef = (p: Person) =>
  (p.sources ?? [])
    .filter((s) => s.kind === 'imported-index' && s.ref)
    .map((s) => s.ref as string)
    .join('; ');

export const CSV_HEADERS = [
  'Surname',
  'Given names',
  'Middle',
  'Prefix',
  'Suffix',
  'Birth surname',
  'Name as carved',
  'Born',
  'Died',
  'Burial',
  'Age',
  'Sex',
  'Relationship',
  'Military',
  'Occupation',
  'Notes',
  'Section',
  'Row',
  'Place in row',
  'Plot',
  'Latitude',
  'Longitude',
  'Accuracy (m)',
  'Position source',
  'Stone kind',
  'Status',
  'Material',
  'Condition',
  'Symbols',
  'Inscription',
  'Epitaph',
  'Convention',
  'Flags',
  'Stone notes',
  'Index source',
  'Person ID',
  'Stone ID',
] as const;

function stoneFields(f: FlatStone | undefined): (string | number | undefined)[] {
  const m = f?.stone;
  const pos = m?.position;
  return [
    f?.section,
    f?.row,
    f?.position,
    m?.address?.plotLabel,
    pos ? pos.lat.toFixed(7) : undefined,
    pos ? pos.lng.toFixed(7) : undefined,
    pos?.accuracyM !== undefined ? pos.accuracyM.toFixed(1) : undefined,
    pos?.source,
    m?.kind,
    m?.status,
    m?.material,
    list(m?.condition),
    list(m?.symbols),
    m?.inscription?.text,
    m?.epitaph,
    m?.inscription?.convention,
    list(m?.flags),
    m?.notes,
  ];
}

function personFields(p: Person | undefined): (string | number | undefined)[] {
  if (!p) return Array.from({ length: 16 }, () => undefined);
  const n = p.name;
  return [
    n.surname,
    n.given,
    n.middle,
    n.prefix,
    n.suffix,
    n.birthSurname,
    n.asCarved,
    date(p.birth),
    date(p.death),
    date(p.burial),
    ageText(p),
    p.sex,
    p.relationshipText,
    military(p),
    p.occupation,
    p.notes,
  ];
}

/**
 * One row per person, with their stone's columns. Stones with nobody on them get one row with
 * the name columns blank, and people on no stone (index records) one row with the stone
 * columns blank, so the file is a full inventory.
 */
export function peopleCsv(input: FlatInput): string {
  const lines = [csvLine(CSV_HEADERS)];
  const line = (p: Person | undefined, f: FlatStone | undefined) =>
    lines.push(
      csvLine([...personFields(p), ...stoneFields(f), p ? indexRef(p) : '', p?.id, f?.stone.id]),
    );
  for (const f of flatStones(input)) {
    if (f.people.length === 0) line(undefined, f);
    for (const p of f.people) line(p, f);
  }
  const live = new Set(input.stones.filter((m) => !m.deleted).map((m) => m.id));
  for (const p of input.people) {
    if (p.deleted || (p.monumentId && live.has(p.monumentId))) continue;
    line(p, undefined);
  }
  return `${lines.join('\r\n')}\r\n`;
}

/** "Row 4, stone 3" in English, for map labels. */
function placeLabel(f: FlatStone): string {
  const where = [
    f.section ? `Section ${f.section}` : '',
    f.row ? `Row ${f.row}` : '',
    f.position !== undefined ? `stone ${f.position}` : '',
    f.stone.address?.plotLabel ? `plot ${f.stone.address.plotLabel}` : '',
  ].filter(Boolean);
  return where.join(', ') || 'Stone';
}

const lifeLine = (p: Person) => {
  const born = date(p.birth);
  const died = date(p.death) || date(p.burial);
  const dates = born || died ? ` (${born || '?'} – ${died || '?'})` : '';
  return `${flatName(p) || '?'}${dates}`;
};

/** Properties of one stone's point; arrays are joined so every GIS tool can show them. */
export function stoneProperties(f: FlatStone): Record<string, string | number | null> {
  const m = f.stone;
  return {
    id: m.id,
    name: f.people.map(flatName).filter(Boolean).join('; ') || placeLabel(f),
    place: placeLabel(f),
    people: f.people.map(lifeLine).join('; ') || null,
    section: f.section ?? null,
    row: f.row ?? null,
    placeInRow: f.position ?? null,
    plot: m.address?.plotLabel ?? null,
    kind: m.kind,
    status: m.status,
    material: m.material ?? null,
    condition: list(m.condition) || null,
    symbols: list(m.symbols) || null,
    inscription: m.inscription?.text ?? null,
    epitaph: m.epitaph ?? null,
    flags: list(m.flags) || null,
    notes: m.notes ?? null,
    accuracyM: m.position?.accuracyM ?? null,
    positionSource: m.position?.source ?? null,
  };
}

/** Placed stones as GeoJSON points (RFC 7946, WGS 84 longitude/latitude). */
export function stonesGeoJson(input: FlatInput): string {
  const features = flatStones(input)
    .filter((f) => f.stone.position)
    .map((f) => {
      const p = f.stone.position as { lng: number; lat: number };
      return {
        type: 'Feature',
        id: f.stone.id,
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: stoneProperties(f),
      };
    });
  return `${JSON.stringify({ type: 'FeatureCollection', name: input.cemetery.name, features }, null, 1)}\n`;
}

const xml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] ?? c,
  );

/** Placed stones as KML 2.2 placemarks, in a folder per row, for Google Earth. */
export function stonesKml(input: FlatInput): string {
  const folders = new Map<string, string[]>();
  for (const f of flatStones(input)) {
    const p = f.stone.position;
    if (!p) continue;
    const props = stoneProperties(f);
    const description = [props.place, props.people, props.inscription, props.notes]
      .filter((x): x is string => typeof x === 'string' && x !== '')
      .join('\n');
    const data = Object.entries(props)
      .filter(([, v]) => v !== null && v !== '')
      .map(([k, v]) => `<Data name="${k}"><value>${xml(String(v))}</value></Data>`)
      .join('');
    const folder =
      [f.section ? `Section ${f.section}` : '', f.row ? `Row ${f.row}` : '']
        .filter(Boolean)
        .join(', ') || 'Other stones';
    const placemarks = folders.get(folder) ?? [];
    placemarks.push(
      `<Placemark id="${xml(f.stone.id)}"><name>${xml(String(props.name))}</name>` +
        `<description>${xml(description)}</description>` +
        `<ExtendedData>${data}</ExtendedData>` +
        `<Point><coordinates>${p.lng},${p.lat},0</coordinates></Point></Placemark>`,
    );
    folders.set(folder, placemarks);
  }
  const body = [...folders]
    .map(([name, marks]) => `<Folder><name>${xml(name)}</name>\n${marks.join('\n')}\n</Folder>`)
    .join('\n');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml(input.cemetery.name)}</name>\n` +
    `${body}\n</Document></kml>\n`
  );
}
