import { describe, expect, it } from 'vitest';
import { detectLocale, directionOf } from './locales';

describe('detectLocale', () => {
  it('matches a regional tag to its language', () => {
    expect(detectLocale(['en-GB'])).toBe('en');
  });

  it('falls back to English for unsupported locales', () => {
    expect(detectLocale(['xx-YY', 'zz'])).toBe('en');
  });
});

describe('directionOf', () => {
  it('knows RTL scripts', () => {
    expect(directionOf('he')).toBe('rtl');
    expect(directionOf('ar-EG')).toBe('rtl');
    expect(directionOf('en-US')).toBe('ltr');
  });
});
