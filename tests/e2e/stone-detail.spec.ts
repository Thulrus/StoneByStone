import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { dismissToasts, importFile, skipWelcome, stubTiles, tapMap } from './helpers';

async function jpeg(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 48;
    const g = c.getContext('2d');
    if (!g) throw new Error('no 2d');
    g.fillStyle = '#777';
    g.fillRect(0, 0, 64, 48);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1] ?? '';
  });
  return Buffer.from(b64, 'base64');
}

test('stone detail: every capture field can be edited', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const file = testInfo.outputPath('three.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 1, perRow: 3 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('tab', { name: 'Diagram' }).click();
  await page.getByRole('button', { name: /^Row 1, stone 1:/ }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'All details' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Row 1, stone 1|.+/);

  // Photos: add one, change its type.
  const photos = page.getByRole('region', { name: 'Photos' });
  await photos.getByRole('button', { name: 'Add photo' }).click();
  const camera = page.getByRole('dialog', { name: /Row 1, stone 1/ });
  await camera.getByRole('button', { name: 'Phone camera' }).click();
  await camera
    .getByTestId('camera-file')
    .setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: await jpeg(page) });
  await expect(photos.getByRole('img', { name: 'Front photo' })).toBeVisible({ timeout: 15_000 });
  await photos.getByRole('combobox', { name: 'Photo type' }).selectOption('context');
  await expect(photos.getByRole('img', { name: 'Context photo' })).toBeVisible();

  // People.
  const people = page.getByRole('region', { name: 'People' });
  await people.getByRole('button', { name: 'Add person' }).click();
  await people.getByRole('textbox', { name: 'Person 1' }).fill('Mary A. Brown');
  await people.getByRole('textbox', { name: 'Person 1' }).press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mary A. Brown');

  // Attributes.
  const details = page.getByRole('region', { name: 'Details' });
  const group = (name: string) => details.getByRole('group', { name });
  await group('Type').getByRole('button', { name: 'Obelisk' }).click();
  await group('Material').getByRole('button', { name: 'Granite' }).click();
  await group('Condition').getByRole('button', { name: 'Cracked' }).click();
  await group('Flags').getByRole('button', { name: 'Uncertain position' }).click();
  for (const [g, chip] of [
    ['Type', 'Obelisk'],
    ['Material', 'Granite'],
    ['Condition', 'Cracked'],
    ['Flags', 'Uncertain position'],
  ] as const)
    await expect(group(g).getByRole('button', { name: chip })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

  // Place in the row.
  await details.getByRole('button', { name: 'Later' }).click();
  await expect(details).toContainText('Stone 2 in the row');

  // Position: on the map, then back.
  const position = page.getByRole('region', { name: 'Position' });
  await expect(position).toContainText('From placing on the map');
  const before = await position.locator('p').first().innerText();
  await position.getByRole('link', { name: 'Place on the map' }).click();
  await expect(page.getByRole('region', { name: 'Place on the map' })).toBeVisible();
  await tapMap(page, 0.3, 0.3);
  await expect(page.getByRole('region', { name: 'Position' })).toBeVisible();
  await dismissToasts(page);
  await expect(position).toContainText('From placing on the map');
  expect(await position.locator('p').first().innerText()).not.toBe(before);

  // History lists the edits.
  const history = page.getByRole('list', { name: 'Changes' });
  await expect(history).toContainText('Changed stone: kind');
  await expect(history).toContainText('Created person');
  await expect(history).toContainText('Created photo');
});
