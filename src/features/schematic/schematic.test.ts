import { expect, test } from 'vitest';
import type { Monument } from '../../domain';
import { groupStones } from './schematic';

let n = 0;
const m = (extra: Partial<Monument>) =>
  ({
    id: `m${++n}`,
    createdAt: String(n).padStart(4, '0'),
    status: 'located',
    ...extra,
  }) as Monument;

test('rows are ordered by index with gaps; others go to the grid or loose', () => {
  const a = m({ address: { rowId: 'r1', rowIndex: 2 } });
  const b = m({ address: { rowId: 'r1', rowIndex: 0 } });
  const c = m({ address: { rowId: 'r1' } });
  const g = m({ legacyGrid: { row: 1, col: 2 } });
  const orphan = m({ address: { rowId: 'gone' } });
  const out = groupStones([a, b, c, g, orphan], new Set(['r1']));
  expect(out.byRow.get('r1')).toEqual([b, null, a, c]);
  expect(out.grid.get('1,2')).toEqual([g]);
  expect(out.loose).toEqual([orphan]);
});

test('a huge index jump shows only a few gap slots', () => {
  const a = m({ address: { rowId: 'r', rowIndex: 0 } });
  const b = m({ address: { rowId: 'r', rowIndex: 500 } });
  expect(groupStones([a, b], new Set(['r'])).byRow.get('r')).toHaveLength(7);
});
