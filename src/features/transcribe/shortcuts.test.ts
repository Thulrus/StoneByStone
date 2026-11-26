import { expect, test } from 'vitest';
import { illegible, uncertain } from './shortcuts';

const run = (value: string, start: number, end = start, kind: 'text' | 'date' = 'text') => {
  const e = uncertain(value, start, end, kind);
  return e ? value.slice(0, e.start) + e.text + value.slice(e.end) : value;
};

test('Ctrl+. marks the word at the caret, the selection, or a date', () => {
  expect(run('JOHN SMITH', 2)).toBe('JOHN[?] SMITH');
  expect(run('JOHN SMITH', 10)).toBe('JOHN SMITH[?]');
  expect(run('JOHN SMITH', 5, 7)).toBe('JOHN SM[?]ITH');
  expect(run('JOHN[?] SMITH', 2)).toBe('JOHN[?] SMITH');
  expect(run('Mar. 3, 1850 ', 3, 3, 'date')).toBe('Mar. 3, 1850?');
  expect(run('1850?', 0, 0, 'date')).toBe('1850?');
  expect(run('', 0, 0, 'date')).toBe('');
});

test('Ctrl+I replaces the selection with [illegible]', () => {
  expect(illegible(3, 5)).toEqual({ start: 3, end: 5, text: '[illegible]' });
});
