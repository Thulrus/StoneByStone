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
