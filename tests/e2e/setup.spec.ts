import { expect, test, type Page } from '@playwright/test';

// A 1×1 grey PNG, so imagery requests never leave the machine.
const TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGO4evXqfwAH8gNMGjzm+gAAAABJRU5ErkJggg==',
  'base64',
);

async function stubTiles(page: Page) {
  await page.route(/basemap\.nationalmap\.gov|tile\.openstreetmap\.org|arcgis/, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: TILE }),
  );
}

/** Tap the map canvas at a fraction of its size, once the map has loaded its imagery. */
async function tapMap(page: Page, fx: number, fy: number) {
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText(/USGS|OpenStreetMap/);
  const canvas = page.locator('.maplibregl-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('no map canvas');
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
}

test('set up a new cemetery with sections, rows and a row line in under 5 minutes', async ({
  page,
}) => {
  const started = Date.now();
  await stubTiles(page);
  await page.goto('./');
  await page.getByRole('button', { name: 'Not now' }).click();

  // Create by dropping a pin. Nothing is fetched from OSM unless asked.
  const osm: string[] = [];
  page.on('request', (r) => {
    if (/nominatim|overpass/.test(r.url())) osm.push(r.url());
  });
  await page.getByRole('link', { name: 'New cemetery' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Hillside Burying Ground');
  await page.getByRole('button', { name: 'Drop a pin on the map' }).click();
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await tapMap(page, 0.5, 0.5);
  await expect(page.getByText('Pin placed.')).toBeVisible();
  await page.getByRole('button', { name: 'Create' }).click();
  expect(osm).toEqual([]);

  // Setup opens first. Two sections with rows.
  await expect(page.getByRole('tab', { name: 'Setup' })).toHaveAttribute('aria-selected', 'true');
  for (const [name, first, count] of [
    ['North', '1', '6'],
    ['South', 'A', '4'],
  ] as const) {
    await page.getByRole('textbox', { name: 'New section' }).fill(name);
    await page.getByRole('button', { name: 'Add section' }).click();
    const block = page.locator('section').filter({ has: page.getByRole('heading', { name }) });
    await block.getByRole('textbox', { name: 'First row' }).fill(first);
    await block.getByRole('textbox', { name: 'How many' }).fill(count);
    await block.getByRole('button', { name: /^Add rows/ }).click();
  }
  await expect(page.getByRole('button', { name: /^Move row/ })).toHaveCount(20);

  // Draw row 1's line on the map: start, end, save.
  await page.getByRole('button', { name: 'Draw line' }).first().click();
  await expect(page.getByText('Drawing North · 1')).toBeVisible();
  await tapMap(page, 0.3, 0.6);
  await tapMap(page, 0.7, 0.4);
  await page.getByRole('button', { name: 'Save line' }).click();
  await expect(page.getByRole('tab', { name: 'Setup' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(/on map/)).toHaveCount(1);

  // Rotate so rows run horizontally; the map's attribution is always visible.
  await page.getByRole('tab', { name: 'Map' }).click();
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText(/USGS|OpenStreetMap/);
  await page.getByRole('button', { name: 'Rows horizontal' }).click();
  await expect
    .poll(() =>
      page.locator('.maplibregl-ctrl-compass .maplibregl-ctrl-icon').getAttribute('style'),
    )
    .toMatch(/rotate\((?!0deg)/);

  // Everything survives a reload.
  await page.reload();
  await page.getByRole('tab', { name: 'Setup' }).click();
  await expect(page.getByRole('heading', { name: 'North' })).toBeVisible();
  await expect(page.getByText(/on map/)).toHaveCount(1);

  expect(Date.now() - started).toBeLessThan(5 * 60_000);
});

test('choose imagery and add a custom XYZ source', async ({ page }) => {
  await stubTiles(page);
  await page.route('https://tiles.example.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: TILE }),
  );
  await page.goto('./');
  await page.getByRole('button', { name: 'Not now' }).click();
  await page.getByRole('link', { name: 'New cemetery' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Test');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('tab', { name: 'Map' }).click();
  await page.getByRole('button', { name: 'Imagery' }).click();
  await page.getByRole('button', { name: 'Add a custom source' }).click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Example orthos');
  await page
    .getByRole('textbox', { name: 'Address' })
    .fill('https://tiles.example.org/{z}/{x}/{y}.png');
  await page.getByRole('textbox', { name: 'Attribution' }).fill('Example County');
  const tile = page.waitForRequest(/tiles\.example\.org\/\d+\/\d+\/\d+\.png/);
  await page.getByRole('button', { name: 'Add source' }).click();
  await expect(page.getByRole('radio', { name: /Example orthos/ })).toBeChecked();
  await tile;
  await page.keyboard.press('Escape');
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('Example County');
});
