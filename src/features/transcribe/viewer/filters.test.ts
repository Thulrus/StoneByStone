import { expect, test } from 'vitest';
import { cssFilter, isUnchanged, NO_ENHANCEMENT, quarterTurn, withPreset } from './filters';

test('presets keep the geometry; unchanged is detected', () => {
  expect(isUnchanged(NO_ENHANCEMENT)).toBe(true);
  const turned = { ...NO_ENHANCEMENT, rotateDeg: 90, vertical: 0.2 };
  const m = withPreset(turned, 'marble');
  expect(m).toMatchObject({ rotateDeg: 90, vertical: 0.2, grayscale: true });
  expect(m.localContrast).toBeGreaterThan(0);
  expect(isUnchanged(m)).toBe(false);
});

test('quarter turns wrap', () => {
  expect(quarterTurn(0, 1)).toBe(90);
  expect(quarterTurn(90, 1)).toBe(-180);
  expect(quarterTurn(-180, -1)).toBe(90);
  expect(quarterTurn(3, -1)).toBe(-87);
});

test('the CSS fallback', () => {
  expect(cssFilter({ ...NO_ENHANCEMENT, brightness: 0.2, invert: true })).toBe(
    'brightness(1.200) contrast(1.000) invert(1)',
  );
});
