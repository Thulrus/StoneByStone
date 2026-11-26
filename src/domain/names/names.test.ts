import { describe, expect, it } from 'vitest';
import type { PersonName } from '../types';
import { expandAbbreviation, expandGivenNames } from './abbreviations';
import { nameSearchKeys, parseName } from './parse';
import { daitchMokotoff, foldToAscii, soundex } from './phonetic';

describe('parseName', () => {
  const cases: [string, Omit<PersonName, 'asCarved'>][] = [
    ['John Smith', { given: 'John', surname: 'Smith' }],
    ['JOHN SMITH', { given: 'JOHN', surname: 'SMITH' }],
    ['John Henry Smith', { given: 'John', middle: 'Henry', surname: 'Smith' }],
    ['John H. Smith', { given: 'John', middle: 'H.', surname: 'Smith' }],
    ['Mary Ann Elizabeth Jones', { given: 'Mary', middle: 'Ann Elizabeth', surname: 'Jones' }],
    ['Wm. Smith', { given: 'Wm.', surname: 'Smith' }],
    ['Jno. Q. Adams', { given: 'Jno.', middle: 'Q.', surname: 'Adams' }],
    ['Rev. Thos. Baldwin', { prefix: 'Rev.', given: 'Thos.', surname: 'Baldwin' }],
    ['Dr. Saml. Fuller', { prefix: 'Dr.', given: 'Saml.', surname: 'Fuller' }],
    ['Capt. Jonathan Allen', { prefix: 'Capt.', given: 'Jonathan', surname: 'Allen' }],
    ['Lieut. Col. Ethan Allen', { prefix: 'Lieut. Col.', given: 'Ethan', surname: 'Allen' }],
    ['Dea. Josiah Hall', { prefix: 'Dea.', given: 'Josiah', surname: 'Hall' }],
    ['Mrs. Abigail Adams', { prefix: 'Mrs.', given: 'Abigail', surname: 'Adams' }],
    ['Miss Lucy Ward', { prefix: 'Miss', given: 'Lucy', surname: 'Ward' }],
    ['Pvt. James O’Neil', { prefix: 'Pvt.', given: 'James', surname: 'O’Neil' }],
    ["Sgt. Patrick O'Brien", { prefix: 'Sgt.', given: 'Patrick', surname: "O'Brien" }],
    ['John Smith Jr.', { given: 'John', surname: 'Smith', suffix: 'Jr.' }],
    ['John Smith, Jr.', { given: 'John', surname: 'Smith', suffix: 'Jr.' }],
    ['John Smith Sr', { given: 'John', surname: 'Smith', suffix: 'Sr' }],
    ['Samuel Gould 2d', { given: 'Samuel', surname: 'Gould', suffix: '2d' }],
    ['Samuel Gould 3d', { given: 'Samuel', surname: 'Gould', suffix: '3d' }],
    ['Henry Ford II', { given: 'Henry', surname: 'Ford', suffix: 'II' }],
    ['Asa Gray, Esq.', { given: 'Asa', surname: 'Gray', suffix: 'Esq.' }],
    ['Eli Todd, M.D.', { given: 'Eli', surname: 'Todd', suffix: 'M.D.' }],
    ['John Smith, Jr., M.D.', { given: 'John', surname: 'Smith', suffix: 'Jr. M.D.' }],
    ['Thos. Hill Junr.', { given: 'Thos.', surname: 'Hill', suffix: 'Junr.' }],
    [
      'Rev. Dr. John Ward Jr.',
      { prefix: 'Rev. Dr.', given: 'John', surname: 'Ward', suffix: 'Jr.' },
    ],
    ['Smith, John', { given: 'John', surname: 'Smith' }],
    ['Smith, John William', { given: 'John', middle: 'William', surname: 'Smith' }],
    ['Smith, John, Jr.', { given: 'John', surname: 'Smith', suffix: 'Jr.' }],
    ['Van Buren, Martin', { given: 'Martin', surname: 'Van Buren' }],
    ['Mary (Jones) Smith', { given: 'Mary', surname: 'Smith', birthSurname: 'Jones' }],
    ['Mary Smith (née Jones)', { given: 'Mary', surname: 'Smith', birthSurname: 'Jones' }],
    ['Mary Smith née Jones', { given: 'Mary', surname: 'Smith', birthSurname: 'Jones' }],
    ['Mary Smith nee Jones', { given: 'Mary', surname: 'Smith', birthSurname: 'Jones' }],
    ['Anna Müller geb. Schmidt', { given: 'Anna', surname: 'Müller', birthSurname: 'Schmidt' }],
    [
      'Sarah Ann (Hale) Lowe',
      { given: 'Sarah', middle: 'Ann', surname: 'Lowe', birthSurname: 'Hale' },
    ],
    ['William "Bill" Smith', { given: 'William', surname: 'Smith', nickname: 'Bill' }],
    ['William “Billy” Smith', { given: 'William', surname: 'Smith', nickname: 'Billy' }],
    ["Margaret 'Peg' Dunn", { given: 'Margaret', surname: 'Dunn', nickname: 'Peg' }],
    ['Johannes van der Berg', { given: 'Johannes', surname: 'van der Berg' }],
    ['Ludwig von Beethoven', { given: 'Ludwig', surname: 'von Beethoven' }],
    ['Marie de la Cruz', { given: 'Marie', surname: 'de la Cruz' }],
    ['Pierre Du Pont', { given: 'Pierre', surname: 'Du Pont' }],
    ['Mary Ann St. John', { given: 'Mary', middle: 'Ann', surname: 'St. John' }],
    ['Angus Mac Donald', { given: 'Angus', surname: 'Mac Donald' }],
    ['Angus MacDonald', { given: 'Angus', surname: 'MacDonald' }],
    ['Søren Kierkegaard', { given: 'Søren', surname: 'Kierkegaard' }],
    ['José María García', { given: 'José', middle: 'María', surname: 'García' }],
    ['Mary-Jane Smith-Jones', { given: 'Mary-Jane', surname: 'Smith-Jones' }],
    ['Abigail', { given: 'Abigail' }],
    ['  John   Smith  ', { given: 'John', surname: 'Smith' }],
  ];

  it.each(cases)('%s', (input, expected) => {
    expect(parseName(input)).toEqual({ asCarved: input.trim().replace(/\s+/g, ' '), ...expected });
  });

  it('returns only asCarved for empty input', () => {
    expect(parseName('   ')).toEqual({ asCarved: '' });
  });
});

describe('abbreviations', () => {
  it.each([
    ['Wm.', 'William'],
    ['wm', 'William'],
    ['Jno.', 'John'],
    ['Chas.', 'Charles'],
    ['Thos.', 'Thomas'],
    ['Geo.', 'George'],
    ['Jas.', 'James'],
    ['Benj.', 'Benjamin'],
    ['Saml.', 'Samuel'],
    ['Eliz.', 'Elizabeth'],
    ['Elizth', 'Elizabeth'],
    ['Robt.', 'Robert'],
    ['Danl', 'Daniel'],
    ['Nathl.', 'Nathaniel'],
    ['Jona.', 'Jonathan'],
    ['Xpher', 'Christopher'],
    ['W^m', 'William'],
  ])('%s -> %s', (abbr, full) => {
    expect(expandAbbreviation(abbr)).toBe(full);
  });

  it.each(['Eliza', 'Sam', 'Jon', 'Hon.', 'Mary', 'Fred'])('leaves %s alone', (name) => {
    expect(expandAbbreviation(name)).toBeUndefined();
  });

  it('expands every word of a given-name string', () => {
    expect(expandGivenNames('Wm. Henry')).toBe('William Henry');
    expect(expandGivenNames('Jno. Q.')).toBe('John Q.');
  });
});

describe('soundex', () => {
  it.each([
    ['Robert', 'R163'],
    ['Rupert', 'R163'],
    ['Rubin', 'R150'],
    ['Ashcraft', 'A261'],
    ['Ashcroft', 'A261'],
    ['Tymczak', 'T522'],
    ['Pfister', 'P236'],
    ['Honeyman', 'H555'],
    ['Smith', 'S530'],
    ['Smyth', 'S530'],
    ['Schmidt', 'S530'],
    ['Lee', 'L000'],
    ['Gutierrez', 'G362'],
    ['Jackson', 'J250'],
    ['Washington', 'W252'],
    ["O'Hara", 'O600'],
    ['Müller', 'M460'],
    ['Miller', 'M460'],
    ['', ''],
  ])('%s -> %s', (name, code) => {
    expect(soundex(name)).toBe(code);
  });
});

describe('Daitch–Mokotoff', () => {
  it.each([
    ['Moskowitz', ['645740']],
    ['Moskovitz', ['645740']],
    ['Auerbach', ['097400', '097500']],
    ['Ohrbach', ['097400', '097500']],
    ['Lipshitz', ['874400']],
    ['Lippszyc', ['874400', '874500']],
    ['Jackson', ['145460', '154600', '445460', '454600']],
    ['Smith', ['463000']],
    ['Schmidt', ['463000']],
    ['Smyth', ['463000']],
    ['Peters', ['734000', '739400']],
    ['Peterson', ['734600', '739460']],
    ['Schwarz', ['474000', '479400']],
    ['Kowalski', ['578450']],
    ['Levine', ['876000']],
    ['Lewin', ['876000']],
    [
      'Rosochowaciec',
      ['944744', '945744', '945754', '944754', '944745', '945745', '945755', '944755'].sort(),
    ],
    ['', []],
  ])('%s -> %j', (name, codes) => {
    expect(daitchMokotoff(name)).toEqual(codes);
  });

  it('folds diacritics and special letters', () => {
    expect(foldToAscii('Łukasz Weiß-Ærø')).toBe('LUKASZWEISSAERO');
  });
});

describe('nameSearchKeys', () => {
  it('clusters Schmidt, Smith and Smyth', () => {
    const keys = ['Johann Schmidt', 'Jno. Smith', 'John Smyth'].map((n) =>
      nameSearchKeys(parseName(n)),
    );
    expect(new Set(keys.map((k) => k.surnameSoundex)).size).toBe(1);
    expect(new Set(keys.map((k) => k.surnameDM.join())).size).toBe(1);
    expect(keys[1]?.given).toBe('john');
  });

  it('includes birth-surname codes', () => {
    const k = nameSearchKeys(parseName('Mary (Jones) Smith'));
    expect(k.birthSurnameSoundex).toBe('J520');
  });
});
