import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { importFile, skipWelcome, stubTiles } from './helpers';

test('the bottom bar stays pinned while Setup scrolls after the map tab', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'phones only');
  const file = testInfo.outputPath('small.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 12, perRow: 3 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.getByRole('tab', { name: 'Setup' }).click();
  await page.getByRole('list', { name: 'Field checklist' }).waitFor();
  const bar = page.locator('[data-bottom-bar]');
  const height = page.viewportSize()?.height ?? 0;
  for (const y of [400, 100_000]) {
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await page.waitForTimeout(200);
    const box = (await bar.boundingBox()) ?? { y: 0, height: 0 };
    expect(Math.round(box.y + box.height)).toBeGreaterThanOrEqual(height - 1);
    expect(Math.round(box.y + box.height)).toBeLessThanOrEqual(height + 1);
  }
});
