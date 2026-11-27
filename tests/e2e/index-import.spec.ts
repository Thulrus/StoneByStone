import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { makeStonesDocument } from '../fixtures/stones';
import { dismissToasts, importFile, skipWelcome, stubTiles } from './helpers';

const csv = fileURLToPath(new URL('../fixtures/index/burial-index.csv', import.meta.url));

test('import a burial index CSV: map columns, save a preset, import, undo', async ({
  page,
}, testInfo) => {
  const file = testInfo.outputPath('empty.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 1, perRow: 2 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: /^People/ }).click();

  await page.getByRole('button', { name: 'Import an index (CSV)' }).click();
  await page.getByTestId('index-input').setInputFiles(csv);
  await expect(page.getByText('burial-index.csv')).toBeVisible();

  // Headers were guessed; the grave column is unmapped. Map it to "Row" and check the preview.
  const preview = page.getByRole('list', { name: 'Preview' });
  await expect(preview.getByRole('listitem').first()).toContainText('John Henry SMITH');
  await expect(preview.getByRole('listitem').first()).toContainText('Section A, Plot 12');
  await page.getByRole('combobox', { name: 'Grave' }).selectOption({ label: 'Row' });
  await expect(preview.getByRole('listitem').first()).toContainText('Section A, Row 3, Plot 12');
  await expect(page.getByText('1 row has no name and will be skipped (line 6).')).toBeVisible();

  await page.getByLabel('Save these columns as a preset').fill('County society');
  await page.getByRole('button', { name: 'Save preset' }).click();
  await expect(page.getByText('Saved preset "County society"').first()).toBeVisible();

  await dismissToasts(page);
  await page.getByRole('button', { name: 'Import 5 people' }).click();
  const list = page.getByRole('list', { name: 'People' });
  await expect(list.getByRole('listitem')).toHaveCount(5);
  await expect(list.getByText('No stone (index record)')).toHaveCount(5);
  await page.getByLabel('Search names, inscriptions and notes').fill('smith');
  await expect(list.getByRole('listitem')).toHaveCount(3); // Smith, Smith, Schmidt

  // Undo takes the whole import back.
  await page.getByRole('button', { name: 'Undo' }).first().click();
  await expect(page.getByText(/No people yet/)).toBeVisible();

  // The preset is picked up again for the same export.
  await page.getByRole('button', { name: 'Import an index (CSV)' }).click();
  await page.getByTestId('index-input').setInputFiles(csv);
  await expect(page.getByRole('combobox', { name: 'Grave' })).toHaveValue('row');
});
