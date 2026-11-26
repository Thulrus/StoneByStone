// Shell bundle budget (plan §25): everything index.html loads up front must stay under
// 250 KB gzip, and the map library must never be part of it (issue #24).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET = 250 * 1024;
const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const files = [...html.matchAll(/(?:src|href)="\/StoneByStone\/(assets\/[^"]+\.(?:js|css))"/g)].map(
  (m) => m[1],
);
let total = 0;
let failed = false;
for (const f of new Set(files)) {
  const buf = readFileSync(join(dist, f));
  total += gzipSync(buf).length;
  if (/maplibre/i.test(buf.toString('utf8'))) {
    console.error(`✗ ${f} contains MapLibre; the map must stay lazy-loaded.`);
    failed = true;
  }
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
if (total > BUDGET) {
  console.error(`✗ Shell is ${kb(total)} gzip, over the ${kb(BUDGET)} budget.`);
  failed = true;
}
console.log(`Shell: ${files.length} files, ${kb(total)} gzip (budget ${kb(BUDGET)}).`);
process.exit(failed ? 1 : 0);
