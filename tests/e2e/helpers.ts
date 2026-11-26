import { expect, type Page } from '@playwright/test';

// A 1×1 grey PNG, so imagery requests never leave the machine.
export const TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGO4evXqfwAH8gNMGjzm+gAAAABJRU5ErkJggg==',
  'base64',
);

export async function stubTiles(page: Page) {
  await page.route(/basemap\.nationalmap\.gov|tile\.openstreetmap\.org|arcgis/, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: TILE }),
  );
}

/** Tap the map canvas at a fraction of its size, once the map has loaded its imagery. */
export async function tapMap(page: Page, fx: number, fy: number) {
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText(/USGS|OpenStreetMap/);
  const canvas = page.locator('.maplibregl-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no map canvas');
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

/** Dismiss the first-run name prompt (an install prompt may also offer "Not now"). */
export async function skipWelcome(page: Page) {
  await page
    .getByRole('region', { name: /What’s your name/ })
    .getByRole('button', { name: 'Not now' })
    .click();
}

/**
 * Import a file from Home and close the "Imported …" toast. Radix pauses a toast while the
 * pointer is over it, and on phones it sits over the cemetery list, so leaving it open can
 * block the next tap.
 */
export async function importFile(page: Page, file: string, timeout = 5000) {
  await page.getByTestId('import-input').setInputFiles(file);
  const toast = page
    .getByRole('region', { name: /Notifications/ })
    .getByRole('listitem')
    .filter({ hasText: 'Imported' });
  await expect(toast).toBeVisible({ timeout });
  await dismissToasts(page);
  await expect(toast).toHaveCount(0);
}

/** Close every open toast and move the pointer off them (hovering pauses Radix toasts). */
export async function dismissToasts(page: Page) {
  const close = page.getByRole('region', { name: /Notifications/ }).getByRole('button', {
    name: 'Dismiss',
  });
  // A toast can time out mid-loop; that's fine.
  while ((await close.count()) > 0)
    await close
      .first()
      .click({ timeout: 2000 })
      .catch(() => {});
  await page.mouse.move(0, 0);
}
