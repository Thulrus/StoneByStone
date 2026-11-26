import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(new URL('../fixtures/v1/example.cem.json', import.meta.url));

test('import, back up, and keep data across reloads', async ({ page }) => {
  // Force the plain-download path: no folder picker, no share sheet.
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'showDirectoryPicker');
    Reflect.deleteProperty(Navigator.prototype, 'canShare');
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Not now' }).click();

  await page.getByTestId('import-input').setInputFiles(fixture);
  const list = page.getByRole('list', { name: 'Cemeteries on this device' });
  await expect(list.getByRole('link')).toHaveCount(1);
  await expect(page.getByText(/stones? (is|are) not backed up/)).toBeVisible();

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up now' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.sbs$/);
  await expect(page.getByText(/not backed up/)).toHaveCount(0);

  await page.reload();
  await expect(list.getByRole('link')).toHaveCount(1);
  await expect(page.getByText(/not backed up/)).toHaveCount(0);
  await list.getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Cemetery not found');
});
