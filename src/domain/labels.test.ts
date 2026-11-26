import { compareLabels, labelSeries, nextLabel } from './labels';

describe('row labels', () => {
  it.each([
    ['', '1'],
    ['1', '2'],
    ['9', '10'],
    ['09', '10'],
    ['007', '008'],
    ['Row 4', 'Row 5'],
    ['R-12', 'R-13'],
    ['A', 'B'],
    ['Z', 'AA'],
    ['AZ', 'BA'],
    ['ZZ', 'AAA'],
    ['d', 'e'],
    ['Row C', 'Row D'],
    ['Section b', 'Section c'],
  ])('%s → %s', (prev, next) => {
    expect(nextLabel(prev)).toBe(next);
  });

  it.each(['Smith plot', 'North', 'Old yard'])('free text %s has no successor', (s) => {
    expect(nextLabel(s)).toBeUndefined();
  });

  it('builds a series', () => {
    expect(labelSeries('1', 3)).toEqual(['1', '2', '3']);
    expect(labelSeries('Y', 4)).toEqual(['Y', 'Z', 'AA', 'AB']);
    expect(labelSeries('Smith plot', 3)).toEqual(['Smith plot']);
    expect(labelSeries('  ', 3)).toEqual([]);
  });

  it('sorts numerically', () => {
    expect(['Row 10', 'Row 2', 'row 1'].sort(compareLabels)).toEqual(['row 1', 'Row 2', 'Row 10']);
  });
});
