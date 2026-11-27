import { expect, test } from 'vitest';
import type { Cemetery, Monument, Person, Row, Section } from '../../domain';
import { parseCsv } from './csv';
import {
  CSV_HEADERS,
  flatStones,
  peopleCsv,
  stonesGeoJson,
  stonesKml,
  type FlatInput,
} from './flat';
import { guessMapping } from './index-csv';

const cemetery = { id: 'c', name: 'Oak & Hill <North>' } as Cemetery;
const section = { id: 's', name: 'A', order: 0 } as Section;
const row = { id: 'r', label: '2', sectionId: 's', order: 0 } as Row;
const stone = (id: string, over: Partial<Monument> = {}) =>
  ({ id, kind: 'headstone', status: 'transcribed', ...over }) as Monument;
const person = (id: string, over: Partial<Person>) => ({ id, name: {}, ...over }) as Person;

function input(): FlatInput {
  const s1 = stone('m1', {
    address: { rowId: 'r', rowIndex: 1 },
    position: { lng: -72.1, lat: 44.2, accuracyM: 3.25, source: 'gps' },
    inscription: { text: 'JOHN PECK\n"died" 1890', convention: 'diplomatic' },
    symbols: ['urn', 'willow'],
  });
  const s0 = stone('m0', {
    address: { rowId: 'r', rowIndex: 0 },
    position: { lng: -72.1001, lat: 44.2, source: 'map' },
    status: 'located',
  });
  const unplaced = stone('m2', { address: { plotLabel: '17' } });
  const gone = stone('m3', {
    deleted: { hlc: 'h', by: 'x' },
    position: { lng: 0, lat: 0, source: 'gps' },
  });
  return {
    cemetery,
    sections: [section],
    rows: [row],
    stones: [s1, s0, unplaced, gone],
    people: [
      person('p1', {
        monumentId: 'm1',
        name: { given: 'John', surname: 'Peck' },
        death: { original: '1890', y: 1890 },
        military: { conflict: 'Civil War', unit: '4th Vt.' },
      }),
      person('p2', { monumentId: 'm1', name: { given: 'Mary', surname: 'Peck' } }),
      person('p3', {
        name: { given: 'Eli', surname: 'Root' },
        sources: [{ kind: 'imported-index', ref: 'soc.csv, line 4' }],
      }),
      person('p4', { name: { surname: 'Gone' }, deleted: { hlc: 'h', by: 'x' } }),
    ],
  };
}

test('stones come in walking order with their section, row and 1-based place', () => {
  const flat = flatStones(input());
  expect(flat.map((f) => f.stone.id)).toEqual(['m0', 'm1', 'm2']);
  expect(flat[1]).toMatchObject({ section: 'A', row: '2', position: 2 });
  expect(flat[1]?.people.map((p) => p.id)).toEqual(['p1', 'p2']);
});

test('CSV: one row per person, blank-name rows for empty stones, stone-less people last', () => {
  const rows = parseCsv(peopleCsv(input()));
  expect(rows[0]).toEqual([...CSV_HEADERS]);
  const col = (h: (typeof CSV_HEADERS)[number]) => CSV_HEADERS.indexOf(h);
  const body = rows.slice(1);
  expect(body.map((r) => r[col('Person ID')])).toEqual(['', 'p1', 'p2', '', 'p3']);
  expect(body.map((r) => r[col('Stone ID')])).toEqual(['m0', 'm1', 'm1', 'm2', '']);
  const john = body[1] ?? [];
  expect(john[col('Surname')]).toBe('Peck');
  expect(john[col('Died')]).toBe('1890');
  expect(john[col('Military')]).toBe('Civil War, 4th Vt.');
  expect(john[col('Inscription')]).toBe('JOHN PECK\n"died" 1890');
  expect(john[col('Symbols')]).toBe('urn; willow');
  expect(john[col('Latitude')]).toBe('44.2000000');
  expect(john[col('Accuracy (m)')]).toBe('3.3');
  expect(john[col('Convention')]).toBe('diplomatic');
  expect(body[3]?.[col('Plot')]).toBe('17');
  expect(body[4]?.[col('Index source')]).toBe('soc.csv, line 4');
});

test('CSV headers are ones the index import recognises', () => {
  const mapping = guessMapping(CSV_HEADERS);
  const at = (h: (typeof CSV_HEADERS)[number]) => mapping[CSV_HEADERS.indexOf(h)];
  expect(at('Surname')).toBe('surname');
  expect(at('Given names')).toBe('given');
  expect(at('Born')).toBe('birth');
  expect(at('Died')).toBe('death');
  expect(at('Section')).toBe('section');
  expect(at('Row')).toBe('row');
  expect(at('Plot')).toBe('plot');
});

test('GeoJSON: a point per placed live stone, with flat properties', () => {
  const doc = JSON.parse(stonesGeoJson(input())) as {
    type: string;
    features: {
      id: string;
      geometry: { type: string; coordinates: number[] };
      properties: Record<string, unknown>;
    }[];
  };
  expect(doc.type).toBe('FeatureCollection');
  expect(doc.features.map((f) => f.id)).toEqual(['m0', 'm1']);
  const f = doc.features[1];
  expect(f?.geometry).toEqual({ type: 'Point', coordinates: [-72.1, 44.2] });
  expect(f?.properties).toMatchObject({
    name: 'John Peck; Mary Peck',
    people: 'John Peck (? – 1890); Mary Peck',
    place: 'Section A, Row 2, stone 2',
    symbols: 'urn; willow',
    status: 'transcribed',
  });
  expect(doc.features[0]?.properties.name).toBe('Section A, Row 2, stone 1');
});

test('KML: well-formed, escaped, a folder per row', () => {
  const text = stonesKml(input());
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  expect(doc.getElementsByTagName('name')[0]?.textContent).toBe('Oak & Hill <North>');
  const marks = [...doc.getElementsByTagName('Placemark')];
  expect(marks.map((m) => m.getAttribute('id'))).toEqual(['m0', 'm1']);
  expect(marks[1]?.getElementsByTagName('coordinates')[0]?.textContent).toBe('-72.1,44.2,0');
  expect(marks[1]?.getElementsByTagName('description')[0]?.textContent).toContain('"died" 1890');
  const folders = [...doc.getElementsByTagName('Folder')];
  expect(folders.map((f) => f.getElementsByTagName('name')[0]?.textContent)).toEqual([
    'Section A, Row 2',
  ]);
});
