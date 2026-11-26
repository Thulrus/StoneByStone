import { expect, test } from 'vitest';
import { fieldChecklist, MIN_FREE_BYTES, type FieldState } from './field-checklist';

const ready: FieldState = {
  battery: { level: 0.9, charging: false },
  freeBytes: 2 * MIN_FREE_BYTES,
  persisted: true,
  tiles: { allowed: true, count: 120 },
  rows: { total: 4, withLine: 2 },
};
const statuses = (s: FieldState) =>
  Object.fromEntries(fieldChecklist(s).map((i) => [i.id, i.status]));

test('all ready', () => {
  expect(new Set(Object.values(statuses(ready)))).toEqual(new Set(['ok']));
});

test('each problem shows as a warning', () => {
  expect(
    statuses({
      battery: { level: 0.2, charging: false },
      freeBytes: MIN_FREE_BYTES - 1,
      persisted: false,
      tiles: { allowed: true, count: 0 },
      rows: { total: 0, withLine: 0 },
    }),
  ).toEqual({ battery: 'warn', storage: 'warn', tiles: 'warn', persisted: 'warn', rows: 'warn' });
});

test('a low battery that is charging is fine', () => {
  expect(statuses({ ...ready, battery: { level: 0.1, charging: true } }).battery).toBe('ok');
});

test('what the browser cannot tell, or imagery that cannot be saved, is unknown', () => {
  expect(
    statuses({
      ...ready,
      battery: undefined,
      freeBytes: undefined,
      persisted: undefined,
      tiles: { allowed: false, count: 0 },
    }),
  ).toMatchObject({
    battery: 'unknown',
    storage: 'unknown',
    tiles: 'unknown',
    persisted: 'unknown',
  });
});
