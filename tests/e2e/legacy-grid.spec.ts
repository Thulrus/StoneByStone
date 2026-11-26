import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { skipWelcome, stubTiles, tapMap, importFile, dismissToasts } from './helpers';

const fixture = fileURLToPath(
  new URL('../fixtures/v1/willow-creek-example.cem.json', import.meta.url),
);

test('pin the Willow Creek v1 grid onto imagery, then make its rows', async ({ page }) => {
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, fixture);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();

  // No coordinates: the diagram shows the grid.
  await expect(page.getByRole('tab', { name: 'Diagram' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Place grid on map' }).click();
  await expect(page.getByRole('tab', { name: 'Map' })).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', { name: 'Grid row 1, column 1', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Now tap the same spot' })).toBeVisible();
  await tapMap(page, 0.25, 0.4);
  await page.getByRole('button', { name: 'Grid row 20, column 25', exact: true }).click();
  await tapMap(page, 0.6, 0.25);
  await expect(page.getByRole('button', { name: 'Remove point 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('Placed 37 stones from the v1 grid').first()).toBeVisible();
  await dismissToasts(page);
  await expect(page.getByRole('list', { name: 'Status key' })).toBeVisible();

  await page.getByRole('tab', { name: 'Diagram' }).click();
  await expect(page.getByRole('button', { name: 'Adjust grid on map' })).toBeVisible();
  await page.getByRole('button', { name: 'Treat grid rows as cemetery rows' }).click();
  await expect(page.getByText(/Made \d+ rows from the grid/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Row \d+, stone 1: / }).first()).toBeVisible();
});
