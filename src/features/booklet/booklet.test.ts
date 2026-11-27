import { expect, test } from 'vitest';
import type { Cemetery, Monument, Person, Row, Section } from '../../domain';
import { buildBooklet, indexLetter, planMap } from './booklet';

const stone = (id: string, rowId: string | undefined, rowIndex?: number) =>
  ({
    id,
    kind: 'headstone',
    status: 'located',
    ...(rowId ? { address: { rowId, rowIndex } } : {}),
  }) as Monument;
const person = (id: string, surname: string, given: string, monumentId?: string) =>
  ({ id, name: { surname, given }, ...(monumentId ? { monumentId } : {}) }) as Person;

test('booklet: people A–Z with their stones, stones grouped by row in walking order', () => {
  const sections = [{ id: 's', name: 'A', order: 0 } as Section];
  const rows = [
    { id: 'r2', label: '2', sectionId: 's', order: 1 } as Row,
    { id: 'r1', label: '1', sectionId: 's', order: 0 } as Row,
  ];
  const stones = [
    stone('m3', 'r2', 0),
    stone('m2', 'r1', 1),
    stone('m1', 'r1', 0),
    stone('m4', undefined),
  ];
  const people = [
    person('p1', 'Ölund', 'Eva', 'm1'),
    person('p2', 'Ames', 'Ruth', 'm3'),
    person('p3', 'Zink', 'Al'),
    { ...person('p4', 'Gone', 'X'), deleted: { hlc: 'h', by: 'c' } },
  ];
  const b = buildBooklet({ cemetery: {} as Cemetery, sections, rows, stones, people });
  expect(b.people).toBe(3);
  expect(b.index.map((e) => e.person.id)).toEqual(['p2', 'p1', 'p3']);
  expect(b.index[0]?.stone).toMatchObject({ row: '2', position: 1 });
  expect(b.index[2]?.stone).toBeUndefined();
  expect(b.groups.map((g) => [g.row, g.stones.map((f) => f.stone.id)])).toEqual([
    ['1', ['m1', 'm2']],
    ['2', ['m3']],
    [undefined, ['m4']],
  ]);
  expect(indexLetter(people[0] as Person)).toBe('O');
  expect(indexLetter({ name: {} } as Person)).toBe('#');
});

test('plan map: north up, keeps the aspect, round scale bar, nothing when unplaced', () => {
  expect(planMap([])).toBeUndefined();
  const dLat = 1 / 110_574;
  const dLng = 1 / (111_320 * Math.cos((44 * Math.PI) / 180));
  // 100 m east-west, 20 m north-south.
  const map = planMap([
    { id: 'sw', lng: -72, lat: 44 },
    { id: 'ne', lng: -72 + 100 * dLng, lat: 44 + 20 * dLat },
  ]);
  expect(map).toBeDefined();
  const [sw, ne] = map?.points ?? [];
  expect(ne && sw && ne.x > sw.x && ne.y < sw.y).toBe(true);
  const k = ((ne?.x ?? 0) - (sw?.x ?? 0)) / 100;
  expect(((sw?.y ?? 0) - (ne?.y ?? 0)) / k).toBeCloseTo(20, 0);
  expect(map?.scale.metres).toBe(20);
  expect(map?.scale.units).toBeCloseTo(20 * k, -1);
});
