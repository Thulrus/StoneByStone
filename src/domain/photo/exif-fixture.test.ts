import { expect, test } from 'vitest';
import { withExif } from '../../../tests/fixtures/exif';
import { readExif } from './exif';

test('the e2e Exif fixture writes what readExif reads', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const e = readExif(withExif(jpeg, { dateTime: '2026:05:01 10:00:20', lat: 44.25, lng: -72.5 }));
  expect(e.localTime).toBe('2026-05-01T10:00:20');
  expect(e.lat).toBeCloseTo(44.25, 6);
  expect(e.lng).toBeCloseTo(-72.5, 6);
});
