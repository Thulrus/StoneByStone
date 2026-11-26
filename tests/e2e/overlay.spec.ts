import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { makeStonesDocument } from '../fixtures/stones';
import { skipWelcome, stubTiles, tapMap, importFile } from './helpers';

const image = fileURLToPath(new URL('../../public/icon-512.png', import.meta.url));

test('pin a plat image with three points, fade it, and place a stone on it', async ({
  page,
}, testInfo) => {
  // Playwright's WebKit is an ephemeral session, like Safari private browsing, and those
  // refuse Blobs in IndexedDB ("Error preparing Blob/File data"). Installed Safari stores them.
  test.skip(
    testInfo.project.name.includes('webkit'),
    'WebKit ephemeral sessions cannot store Blobs',
  );
  const file = testInfo.outputPath('small.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 2, perRow: 3 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('tab', { name: 'Setup' }).click();
  await page.getByTestId('overlay-input').setInputFiles(image);

  // Adding an image goes straight to pinning it.
  await expect(page.getByRole('tab', { name: 'Map' })).toHaveAttribute('aria-selected', 'true');
  const img = page.getByRole('img', { name: /Overlay image/ });
  for (const [ix, iy, mx, my] of [
    [0.1, 0.1, 0.3, 0.2],
    [0.9, 0.1, 0.7, 0.25],
    [0.5, 0.9, 0.5, 0.6],
  ] as const) {
    const box = await img.boundingBox();
    if (!box) throw new Error('no image');
    await img.click({ position: { x: box.width * ix, y: box.height * iy } });
    await tapMap(page, mx, my);
  }
  await expect(page.getByText(/Point 3: off by/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('icon-512 is on the map').first()).toBeVisible();

  await page.getByRole('button', { name: 'Place stones' }).click();
  await tapMap(page, 0.5, 0.35);
  await expect(page.getByText('Stone added').first()).toBeVisible();
  await page.getByRole('button', { name: 'Done placing' }).click();

  await page.getByRole('tab', { name: 'Setup' }).click();
  await expect(page.getByText(/On the map, average error/)).toBeVisible();
  await page.getByRole('slider', { name: 'Opacity' }).fill('40');
  await page.reload();
  await page.getByRole('tab', { name: 'Setup' }).click();
  await expect(page.getByRole('slider', { name: 'Opacity' })).toHaveValue('40');
});
