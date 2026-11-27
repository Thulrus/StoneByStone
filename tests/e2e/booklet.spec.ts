import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { importFile, skipWelcome, stubTiles } from './helpers';

/** 10 rows of 20, with a person on every transcribed stone. */
function withPeople() {
  const doc = makeStonesDocument({ rows: 10, perRow: 20 });
  const stones = doc.data.monuments as {
    id: string;
    cemeteryId: string;
    createdAt: string;
    status: string;
  }[];
  const stamp = (doc.cemetery.stamps as Record<string, unknown>).name;
  const surnames = ['Peck', 'Ames', 'Hale', 'Root', 'Zink'];
  doc.data.persons = stones
    .filter((m) => m.status === 'transcribed' || m.status === 'verified')
    .map((m, i) => {
      const f = {
        monumentId: m.id,
        name: { given: `Given${i}`, surname: surnames[i % 5] },
        death: { original: String(1850 + i), y: 1850 + i },
      };
      return {
        id: `0193f1c2-0004-7000-8000-${String(i).padStart(12, '0')}`,
        cemeteryId: m.cemeteryId,
        createdAt: m.createdAt,
        ...f,
        stamps: Object.fromEntries(Object.keys(f).map((k) => [k, stamp])),
      };
    }) as never[];
  return doc;
}

test('booklet: title, map, index A–Z and row listings; prints without app chrome', async ({
  page,
  browserName,
}, testInfo) => {
  const file = testInfo.outputPath('booklet.sbs.json');
  await writeFile(file, JSON.stringify(withPeople()));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: /^Export and print/ }).click();
  await page.getByRole('link', { name: 'Open booklet' }).click();

  const booklet = page.getByRole('article', { name: 'Booklet' });
  await expect(booklet.getByRole('heading', { level: 1 })).toHaveText(
    'Performance test (200 stones)',
  );
  await expect(booklet.getByText('200 stones · 100 people')).toBeVisible();
  await expect(booklet.getByRole('img', { name: /^Plan of/ })).toBeVisible();
  await expect(booklet.locator('svg circle')).toHaveCount(200);
  const index = booklet.getByRole('region', { name: 'A' });
  await expect(index.getByRole('listitem')).toHaveCount(20);
  await expect(index.getByRole('listitem').first()).toContainText('Ames, Given1');
  await expect(index.getByRole('listitem').first()).toContainText('Row 1, stone 4');
  await expect(booklet.getByRole('heading', { name: 'Row 10', level: 3 })).toBeVisible();
  await expect(booklet.getByText('Transcription convention')).toBeVisible();

  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeHidden();
  await expect(page.getByRole('banner')).toBeHidden();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  if (browserName === 'chromium') {
    const pdf = await page.pdf({ format: 'A4' });
    await writeFile(testInfo.outputPath('booklet.pdf'), pdf);
    const pages = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length ?? 0;
    expect(pages).toBeGreaterThan(4);
    expect(pages).toBeLessThan(40);
  }
});
