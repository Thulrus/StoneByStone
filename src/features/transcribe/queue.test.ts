import { expect, test } from 'vitest';
import type { Monument, Photo, Row } from '../../domain';
import { buildQueue, photoOrder, queueOrder, rowNeighbours } from './queue';

const row = (id: string): Row => ({ id, label: id }) as Row;
let n = 0;
const stone = (over: Partial<Monument>): Monument =>
  ({
    id: `m${++n}`,
    status: 'photographed',
    createdAt: String(n).padStart(4, '0'),
    ...over,
  }) as Monument;

test('walking order: rows in layout order, then index; loose stones last by grid', () => {
  const rows = [row('A'), row('B')];
  const b0 = stone({ address: { rowId: 'B', rowIndex: 0 } });
  const a1 = stone({ address: { rowId: 'A', rowIndex: 1 } });
  const loose2 = stone({ legacyGrid: { row: 2, col: 1 } });
  const loose1 = stone({ legacyGrid: { row: 1, col: 5 } });
  const a0 = stone({ address: { rowId: 'A', rowIndex: 0 } });
  const ordered = queueOrder([b0, a1, loose2, loose1, a0], rows).map((m) => m.id);
  expect(ordered).toEqual([a0, a1, b0, loose1, loose2].map((m) => m.id));
});

test('the queue filters by status; all keeps everything', () => {
  const rows = [row('A')];
  const done = stone({ status: 'transcribed', address: { rowId: 'A', rowIndex: 0 } });
  const todo = stone({ address: { rowId: 'A', rowIndex: 1 } });
  const bare = stone({ status: 'located', address: { rowId: 'A', rowIndex: 2 } });
  expect(buildQueue([bare, done, todo], rows, 'photographed')).toEqual([todo.id]);
  expect(buildQueue([bare, done, todo], rows, 'all')).toEqual([done.id, todo.id, bare.id]);
});

test('row neighbours: up to two either side, in row order', () => {
  const s = [0, 1, 3, 4, 5, 6].map((i) => stone({ address: { rowId: 'A', rowIndex: i } }));
  const other = stone({ address: { rowId: 'B', rowIndex: 4 } });
  const current = s[3];
  if (!current) throw new Error('setup');
  const { before, after } = rowNeighbours(current, [...s, other]);
  expect(before.map((m) => m.address?.rowIndex)).toEqual([1, 3]);
  expect(after.map((m) => m.address?.rowIndex)).toEqual([5, 6]);
  expect(rowNeighbours(stone({}), s)).toEqual({ before: [], after: [] });
});

test('photos: front first', () => {
  const p = (id: string, role: Photo['role']) => ({ id, role }) as Photo;
  expect(photoOrder([p('a', 'detail'), p('b', 'front'), p('c', 'back')]).map((x) => x.id)).toEqual([
    'b',
    'c',
    'a',
  ]);
});
