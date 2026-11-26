import { expect, test } from 'vitest';
import { parseName } from './names/parse';
import { inverseRelation, nameMatch, parseCarvedRelation } from './relations';

test('inverse sides', () => {
  expect(inverseRelation('parent')).toBe('child');
  expect(inverseRelation('child')).toBe('parent');
  expect(inverseRelation('spouse')).toBe('spouse');
});

test('carved phrases', () => {
  expect(parseCarvedRelation('wife of John Brown')).toEqual({
    type: 'spouse',
    names: ['John Brown'],
  });
  expect(parseCarvedRelation('relict of Capt. Amos Hill')).toMatchObject({ type: 'spouse' });
  expect(parseCarvedRelation('son of John & Mary Smith')).toEqual({
    type: 'parent',
    names: ['John Smith', 'Mary Smith'],
  });
  expect(parseCarvedRelation('dau. of Jno. and Sarah', 'Ward')).toEqual({
    type: 'parent',
    names: ['Jno. Ward', 'Sarah Ward'],
  });
  expect(parseCarvedRelation('his wife')).toEqual({ type: 'spouse', names: [] });
  expect(parseCarvedRelation('')).toEqual({ names: [] });
});

test('name match: expanded given names, phonetic surnames', () => {
  const john = { name: parseName('John Smith') };
  expect(nameMatch(john, 'Jno. Smyth')).toBe(1);
  expect(nameMatch(john, 'John')).toBe(0.6);
  expect(nameMatch(john, 'Mary Smith')).toBe(0.3);
  expect(nameMatch(john, 'Mary Jones')).toBe(0);
});
