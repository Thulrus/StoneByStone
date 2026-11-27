import { expect, test } from 'vitest';
import { findDuplicatePeople, findDuplicateStones, pairKey } from './duplicates';
import type { FuzzyDate, Monument, Person, PersonName } from './types';

let n = 0;
const year = (y: number): FuzzyDate => ({ original: String(y), y });
const person = (name: PersonName, over: Partial<Person> = {}): Person =>
  ({ id: `p${String(++n).padStart(3, '0')}`, name, ...over }) as Person;
const stone = (lng: number, lat: number, over: Partial<Monument> = {}): Monument =>
  ({
    id: `m${String(++n).padStart(3, '0')}`,
    status: 'transcribed',
    position: { lng, lat, source: 'gps' },
    ...over,
  }) as Monument;
const ids = (pairs: { a: { id: string }; b: { id: string } }[]) =>
  pairs.map((p) => pairKey(p.a.id, p.b.id));

test('people: similar name and close dates pair up; far dates and other names do not', () => {
  const a = person({ given: 'Wm.', surname: 'Smyth' }, { death: year(1890), monumentId: 's1' });
  const b = person({ given: 'William', surname: 'Smith' }, { death: year(1891), monumentId: 's2' });
  const far = person({ given: 'William', surname: 'Smith' }, { death: year(1950) });
  const other = person({ given: 'Mary', surname: 'Jones' }, { death: year(1890) });
  const found = findDuplicatePeople([a, b, far, other]);
  expect(ids(found)).toEqual([pairKey(a.id, b.id)]);
  expect(found[0]?.date).toBeGreaterThan(0);
});

test('people: no years needs the identical full name', () => {
  const a = person({ given: 'John', surname: 'Peck' });
  const b = person({ given: 'JOHN', surname: 'Peck' });
  const c = person({ surname: 'Peck' });
  const d = person({ given: 'Jon', surname: 'Peck' });
  expect(ids(findDuplicatePeople([a, b, c, d]))).toEqual([pairKey(a.id, b.id)]);
});

test('people: differing suffixes, linked people, deleted ones and index-vs-stone are skipped', () => {
  const sr = person({ given: 'John', surname: 'Peck', suffix: 'Sr.' }, { death: year(1900) });
  const jr = person({ given: 'John', surname: 'Peck', suffix: 'Jr.' }, { death: year(1900) });
  const x = person({ given: 'Ann', surname: 'Hale' }, { death: year(1880) });
  const y = person(
    { given: 'Ann', surname: 'Hale' },
    { death: year(1880), relations: [{ type: 'other', personId: x.id }] },
  );
  const gone = person(
    { given: 'Ann', surname: 'Hale' },
    { death: year(1880), deleted: { hlc: 'h', by: 'c' } },
  );
  const onStone = person({ given: 'Eli', surname: 'Root' }, { death: year(1870), monumentId: 's' });
  const record = person(
    { given: 'Eli', surname: 'Root' },
    { death: year(1870), sources: [{ kind: 'imported-index' }] },
  );
  expect(findDuplicatePeople([sr, jr, x, y, gone, onStone, record])).toEqual([]);
});

test('people: a birth surname is a block key, and a pair is reported once', () => {
  const a = person({ given: 'Ruth', surname: 'Hale', birthSurname: 'Ames' }, { death: year(1900) });
  const b = person({ given: 'Ruth', surname: 'Ames' }, { death: year(1900) });
  const c = person({ given: 'Ruth', surname: 'Hale', birthSurname: 'Ames' }, { death: year(1900) });
  const found = findDuplicatePeople([a, b, c]);
  expect(new Set(ids(found)).size).toBe(found.length);
  expect(ids(found)).toContain(pairKey(a.id, c.id));
  expect(ids(found)).toContain(pairKey(a.id, b.id));
});

test('stones: close with alike text pair up; far, unalike, untexted or linked do not', () => {
  const lat = 44;
  const dLat = 1 / 110_574; // ≈ 1 m
  const a = stone(-72, lat, { inscription: { text: 'In memory of John Peck died 1890' } });
  const b = stone(-72, lat + 0.5 * dLat, { inscription: { text: 'John Peck died 1890' } });
  const far = stone(-72, lat + 3 * dLat, { inscription: { text: 'John Peck died 1890' } });
  const unalike = stone(-72, lat - 0.5 * dLat, { inscription: { text: 'Mary Ames 1902' } });
  const blank1 = stone(-71.99999, lat);
  const blank2 = stone(-71.99999, lat + 0.2 * dLat);
  const foot = stone(-72, lat + 0.3 * dLat, {
    inscription: { text: 'J.P. 1890 John Peck' },
    relatedMonuments: [{ id: a.id, relation: 'footstone-of' }],
  });
  const found = findDuplicateStones([a, b, far, unalike, blank1, blank2, foot], new Map());
  expect(ids(found)).toEqual(expect.arrayContaining([pairKey(a.id, b.id)]));
  expect(ids(found)).not.toContain(pairKey(a.id, far.id));
  expect(ids(found)).not.toContain(pairKey(a.id, unalike.id));
  expect(ids(found)).not.toContain(pairKey(blank1.id, blank2.id));
  expect(ids(found)).not.toContain(pairKey(a.id, foot.id));
  const ab = found.find((d) => pairKey(d.a.id, d.b.id) === pairKey(a.id, b.id));
  expect(ab?.distanceM).toBeCloseTo(0.5, 1);
  expect(found.map((d) => d.distanceM)).toEqual(
    [...found.map((d) => d.distanceM)].sort((x, y) => x - y),
  );
});

test('stones: boilerplate words alone do not make two stones alike', () => {
  const a = stone(10, 50, { inscription: { text: 'In loving memory of Mary, wife of' } });
  const b = stone(10.000005, 50, { inscription: { text: 'In loving memory of Ann, wife of' } });
  const c = stone(10.00001, 50, { inscription: { text: 'Stone 3' } });
  const d = stone(10.000015, 50, { inscription: { text: 'Stone 4' } });
  expect(findDuplicateStones([a, b, c, d], new Map())).toEqual([]);
});

test('stones: the names of the people on them count as text', () => {
  const a = stone(10, 50);
  const b = stone(10.000005, 50);
  const people = new Map([
    [a.id, [person({ given: 'Wm', surname: 'Hale' })]],
    [b.id, [person({ given: 'William', surname: 'Hale' })]],
  ]);
  expect(ids(findDuplicateStones([a, b], people))).toEqual([pairKey(a.id, b.id)]);
});

test('stones: 2,000 stones in a 1 m grid check quickly', () => {
  const many: Monument[] = [];
  for (let i = 0; i < 2000; i++) {
    many.push(
      stone(10 + (i % 50) * 1.5e-5, 50 + Math.floor(i / 50) * 1e-5, {
        inscription: { text: `Stone ${i} name${i}` },
      }),
    );
  }
  const t0 = performance.now();
  findDuplicateStones(many, new Map());
  expect(performance.now() - t0).toBeLessThan(500);
});
