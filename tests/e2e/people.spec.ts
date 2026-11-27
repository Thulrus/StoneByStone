import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { importFile, skipWelcome, stubTiles } from './helpers';

/** The fixture plus people: three sound-alike surnames on stones, one veteran with no stone. */
function withPeople() {
  const doc = makeStonesDocument({ rows: 1, perRow: 4 });
  const [first] = doc.data.monuments as { id: string; cemeteryId: string; createdAt: string }[];
  const { cemeteryId, createdAt } = first ?? { cemeteryId: '', createdAt: '' };
  const stamp = (doc.cemetery.stamps as Record<string, unknown>).name;
  const stones = doc.data.monuments as { id: string }[];
  const people = [
    { given: 'Johann', surname: 'Schmidt', y: 1851, stone: 2 },
    { given: 'John', surname: 'Smith', y: 1890, stone: 3 },
    { given: 'Mary', surname: 'Smyth', y: 1902, stone: 3 },
    { given: 'Wm.', surname: 'Peck', y: 1864, military: { conflict: 'Civil War' } },
  ].map((p, i) => {
    const f = {
      name: { given: p.given, surname: p.surname },
      death: { original: String(p.y), y: p.y },
      ...(p.stone !== undefined ? { monumentId: stones[p.stone]?.id } : {}),
      ...(p.military ? { military: p.military } : {}),
    };
    return {
      id: `0193f1c2-0004-7000-8000-${String(i).padStart(12, '0')}`,
      cemeteryId,
      createdAt,
      ...f,
      stamps: Object.fromEntries(Object.keys(f).map((k) => [k, stamp])),
    };
  });
  doc.data.persons = people as never[];
  return doc;
}

test('people: sound-alike search, abbreviations, and filters', async ({ page }, testInfo) => {
  const file = testInfo.outputPath('people.sbs.json');
  await writeFile(file, JSON.stringify(withPeople()));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: /^People/ }).click();

  const list = page.getByRole('list', { name: 'People' });
  await expect(list.getByRole('listitem')).toHaveCount(4);
  await expect(page.getByText('4 people', { exact: true })).toBeVisible();

  const search = page.getByLabel('Search names, inscriptions and notes');
  await search.fill('smith');
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await expect(list.getByRole('listitem').first()).toContainText('John Smith');
  await expect(list).toContainText('Johann Schmidt');
  await expect(list).toContainText('Mary Smyth');

  await search.fill('william');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Wm. Peck');
  await expect(list).toContainText('No stone (index record)');

  await search.fill('');
  await page.getByText('Filters', { exact: true }).click();
  await page.getByLabel('Died from (year)').fill('1880');
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await page.getByLabel('Died from (year)').fill('');
  await page.getByLabel('Veterans only').check();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Wm. Peck');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(4);

  // A result on a stone opens that stone.
  await search.fill('smyth');
  await list.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/stone\//);
});
