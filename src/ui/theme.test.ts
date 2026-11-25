import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest runs from the repo root.
const css = readFileSync(resolve('src/ui/theme.css'), 'utf8');

function tokensFor(theme: string): Record<string, string> {
  const block = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`).exec(css);
  if (!block?.[1]) throw new Error(`theme ${theme} not found`);
  const out: Record<string, string> = {};
  for (const m of block[1].matchAll(/--sbs-([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// [foreground, background, minimum ratio]. 4.5 for text, 3 for UI component boundaries.
const pairs: Array<[string, string, number]> = [
  ['fg', 'bg', 4.5],
  ['fg', 'surface', 4.5],
  ['fg', 'surface-2', 4.5],
  ['fg-muted', 'bg', 4.5],
  ['fg-muted', 'surface', 4.5],
  ['fg-muted', 'surface-2', 4.5],
  ['primary-fg', 'primary', 4.5],
  ['danger-fg', 'danger', 4.5],
  ['primary', 'bg', 4.5],
  ['primary', 'surface', 4.5],
  ['danger', 'surface', 4.5],
  ['border', 'bg', 3],
  ['border', 'surface', 3],
  ['focus', 'bg', 3],
  ['focus', 'surface', 3],
];

describe.each(['light', 'dark', 'sunlight'])('%s theme', (theme) => {
  const t = tokensFor(theme);

  it.each(pairs)('%s on %s meets %d:1', (fg, bg, min) => {
    expect(t[fg], `missing --sbs-${fg}`).toBeDefined();
    expect(t[bg], `missing --sbs-${bg}`).toBeDefined();
    expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(min);
  });
});
