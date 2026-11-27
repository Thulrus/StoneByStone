import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { withExif } from '../fixtures/exif';
import { makeStonesDocument } from '../fixtures/stones';
import { importFile, skipWelcome, stubTiles } from './helpers';

/** `n` small, distinct real JPEGs (so each has its own sha256). */
async function jpegs(page: Page, n: number): Promise<Buffer[]> {
  const all = await page.evaluate((count) => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 48;
    const g = c.getContext('2d');
    if (!g) throw new Error('no 2d');
    return Array.from({ length: count }, (_, i) => {
      g.fillStyle = `rgb(${i % 256}, ${(i * 7) % 256}, 90)`;
      g.fillRect(0, 0, 64, 48);
      g.fillStyle = '#fff';
      g.fillText(String(i), 10, 30);
      return c.toDataURL('image/jpeg', 0.9).split(',')[1] ?? '';
    });
  }, n);
  return all.map((b) => Buffer.from(b, 'base64'));
}

const pad = (n: number) => String(n).padStart(2, '0');

test('photo import: 121 photos become stones in EXIF time order, front and back paired', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const file = testInfo.outputPath('photos.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 1, perRow: 1 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);

  // 60 stones, a front and a back 5 s apart, 20 s between stones, 1 m north each;
  // files named in reverse so only EXIF time gives the order; one photo with no EXIF.
  const raw = await jpegs(page, 121);
  const files = raw.slice(0, 120).map((jpeg, i) => {
    const stone = Math.floor(i / 2);
    const s = stone * 20 + (i % 2) * 5;
    const dateTime = `2026:05:01 10:${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
    const buffer = Buffer.from(withExif(jpeg, { dateTime, lat: 44 + stone / 110_574, lng: -72.6 }));
    return { name: `IMG_${pad(200 - i)}.jpg`, mimeType: 'image/jpeg', buffer };
  });
  files.push({ name: 'scan.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(raw[120] ?? []) });

  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: /^Import photos/ }).click();
  await page.getByTestId('photo-import-input').setInputFiles(files);

  await expect(
    page.getByText('121 photos read: 120 with the time taken, 120 with a location'),
  ).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByRole('heading', { name: '121 stones to add' })).toBeVisible();
  await page.getByRole('radio', { name: 'Photos taken within 10 seconds are one stone' }).check();
  await expect(page.getByRole('heading', { name: '61 stones to add' })).toBeVisible();
  await page.getByRole('button', { name: 'Import 61 stones' }).click();
  // Writing 120 photos takes a while on WebKit.
  await expect(page.getByText('61 stones added from photos', { exact: true })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: /^Export and print/ }).click();
  // The fixture's stone and 60 placed by GPS; the photo with no EXIF has no place.
  await expect(page.getByText('61 placed stones', { exact: false })).toBeVisible();

  // Importing some of the same photos again adds nothing.
  await page.goBack();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: /^Import photos/ }).click();
  await page.getByTestId('photo-import-input').setInputFiles(files.slice(0, 4));
  await expect(page.getByText('4 are already in this cemetery and are skipped')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import 0 stones' })).toBeDisabled();
});
