import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { stubTiles, skipWelcome, importFile, dismissToasts } from './helpers';

const cachedTiles = (page: Page) =>
  page.evaluate(async () => (await (await caches.open('sbs-tiles-usgs-imagery')).keys()).length);

test('download a US cemetery for offline use, then delete it', async ({ page }, testInfo) => {
  const file = testInfo.outputPath('small.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 3, perRow: 5 })));
  const fetched: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('nationalmap.gov')) fetched.push(r.url());
  });
  // A low battery, so the checklist has something real to warn about.
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'getBattery', {
      configurable: true,
      value: () => Promise.resolve({ level: 0.2, charging: false }),
    }),
  );
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('tab', { name: 'Setup' }).click();

  const panel = page.locator('section').filter({ hasText: 'Offline map' });
  const checklist = page.getByRole('list', { name: 'Field checklist' });
  const check = (status: string, text: string | RegExp) =>
    expect(checklist.locator(`li[data-status="${status}"]`).filter({ hasText: text })).toHaveCount(
      1,
    );
  await check('warn', 'Battery 20%');
  await check('ok', /3 rows planned/);
  await check('warn', 'Map not saved for offline yet');
  await expect(panel).toContainText(/USGS National Map imagery: about \d+ tiles/);
  const before = fetched.length;
  await panel.getByRole('button', { name: 'Download for offline' }).click();
  await expect(page.getByText('Map saved for offline use').first()).toBeVisible();
  await dismissToasts(page);
  await expect(panel).toContainText(/Saved for offline: \d+ tiles/);
  await check('ok', /Map saved for offline \(\d+ tiles\)/);
  const n = await cachedTiles(page);
  expect(n).toBeGreaterThan(0);
  expect(fetched.length - before).toBeGreaterThanOrEqual(n);

  await panel.getByRole('button', { name: 'Delete offline map' }).click();
  await expect(page.getByText('Offline map deleted').first()).toBeVisible();
  expect(await cachedTiles(page)).toBe(0);
  await expect(panel.getByRole('button', { name: 'Download for offline' })).toBeVisible();
  await check('warn', 'Map not saved for offline yet');
});
