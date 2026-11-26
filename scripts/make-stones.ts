// Writes a synthetic cemetery with many placed stones, for device performance checks (#28).
// Usage: node scripts/make-stones.ts [rows] [perRow] [out]   (defaults: 100 100 stones-10k.sbs.json)
import { writeFileSync } from 'node:fs';
import { makeStonesDocument } from '../tests/fixtures/stones.ts';

const [rows = '100', perRow = '100', out = 'stones-10k.sbs.json'] = process.argv.slice(2);
writeFileSync(
  out,
  JSON.stringify(makeStonesDocument({ rows: Number(rows), perRow: Number(perRow) })),
);
console.log(`Wrote ${out}`);
