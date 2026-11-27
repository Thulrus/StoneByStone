import { expect, test } from 'vitest';
import { csvLine, detectDelimiter, parseCsv } from './csv';

test('quotes, doubled quotes, line breaks in fields, CRLF and BOM', () => {
  const text = '﻿Name,Notes\r\n"Smith, John","said ""hi""\nthen left"\r\n\r\nPeck,\n';
  expect(parseCsv(text)).toEqual([
    ['Name', 'Notes'],
    ['Smith, John', 'said "hi"\nthen left'],
    ['Peck', ''],
  ]);
});

test('semicolon and tab files are detected', () => {
  expect(detectDelimiter('a;b;c\n1;2,5;3\n')).toBe(';');
  expect(parseCsv('a\tb\n1\t2')).toEqual([
    ['a', 'b'],
    ['1', '2'],
  ]);
  expect(detectDelimiter('Name,Born\n"Doe; Jane",1850\n')).toBe(',');
});

test('ragged rows are kept as they are', () => {
  expect(parseCsv('a,b,c\n1\n1,2,3,4')).toEqual([['a', 'b', 'c'], ['1'], ['1', '2', '3', '4']]);
});

test('writing round-trips', () => {
  const rows = [
    ['Row 1', 'say "hi"', 'a,b', ' x', 'line\nbreak'],
    ['', '1', '', '', ''],
  ];
  const text = rows.map(csvLine).join('\r\n');
  expect(parseCsv(text)).toEqual(rows);
  expect(csvLine(['Row 1', 3, undefined, 'say "hi"'])).toBe('Row 1,3,,"say ""hi"""');
});
