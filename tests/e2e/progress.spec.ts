import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { importFile, skipWelcome, stubTiles } from './helpers';

test('progress: numbers match the data; the revisit checklist downloads', async ({
  page,
}, testInfo) => {
  // Per row of 4: stones 1–2 located (no photo, no text), 3 transcribed, 4 verified.
  const doc = makeStonesDocument({ rows: 2, perRow: 4 });
  const flagged = doc.data.monuments[5] as Record<string, unknown> & {
    stamps: Record<string, unknown>;
  };
  flagged.flags = ['needs-revisit'];
  flagged.notes = 'Lichen, try raking light';
  flagged.stamps.flags = flagged.stamps.kind;
  flagged.stamps.notes = flagged.stamps.kind;
  const file = testInfo.outputPath('progress.sbs.json');
  await writeFile(file, JSON.stringify(doc));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: /^Progress/ }).click();

  await expect(page.getByRole('heading', { name: 'Progress', level: 1 })).toBeVisible();
  await expect(page.getByText('8 stones · 50% transcribed')).toBeVisible();
  await expect(page.getByText('Located: 4 (50%)')).toBeVisible();
  await expect(page.getByText('Verified: 2 (25%)')).toBeVisible();

  const row2 = page.getByRole('row', { name: /^2 / });
  await expect(row2.getByRole('cell').first()).toHaveText('4');
  await expect(row2.getByRole('cell').nth(1)).toHaveText('2 (50%)');

  // The row table scrolls on its own; the page never scrolls sideways.
  // (WebKit counts the table's scroller in the document's scrollWidth, so try to scroll.)
  const scrolledX = await page.evaluate(() => {
    window.scrollTo(200, window.scrollY);
    const x = window.scrollX;
    window.scrollTo(0, window.scrollY);
    return x;
  });
  expect(scrolledX).toBe(0);

  const list = page.getByRole('list', { name: 'Stones to revisit' });
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Row 2, stone 2');
  await expect(list).toContainText('Lichen, try raking light');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download checklist (CSV)' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('performance-test-8-stones-revisit.csv');
  const path = testInfo.outputPath('revisit.csv');
  await download.saveAs(path);
  const { readFile } = await import('node:fs/promises');
  const csv = await readFile(path, 'utf8');
  expect(csv.split('\r\n')).toEqual([
    'Done,Where,Status,Flags,Notes',
    ',"Row 2, stone 2",Located,,"Lichen, try raking light"',
    '',
  ]);
});
