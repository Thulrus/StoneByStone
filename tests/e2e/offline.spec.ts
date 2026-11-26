import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { stubTiles, skipWelcome, importFile } from './helpers';

const cachedTiles = (page: Page) =>
  page.evaluate(async () => (await (await caches.open('sbs-tiles-usgs-imagery')).keys()).length);

test('download a US cemetery for offline use, then delete it', async ({ page }, testInfo) => {
  const file = testInfo.outputPath('small.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 3, perRow: 5 })));
  const fetched: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('nationalmap.gov')) fetched.push(r.url());
  });
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('tab', { name: 'Setup' }).click();

  const panel = page.locator('section').filter({ hasText: 'Offline map' });
  await expect(panel).toContainText(/USGS National Map imagery: about \d+ tiles/);
  const before = fetched.length;
  await panel.getByRole('button', { name: 'Download for offline' }).click();
  await expect(page.getByText('Map saved for offline use').first()).toBeVisible();
  await expect(panel).toContainText(/Saved for offline: \d+ tiles/);
  const n = await cachedTiles(page);
  expect(n).toBeGreaterThan(0);
  expect(fetched.length - before).toBeGreaterThanOrEqual(n);

  await panel.getByRole('button', { name: 'Delete offline map' }).click();
  await expect(page.getByText('Offline map deleted').first()).toBeVisible();
  expect(await cachedTiles(page)).toBe(0);
  await expect(panel.getByRole('button', { name: 'Download for offline' })).toBeVisible();
});
