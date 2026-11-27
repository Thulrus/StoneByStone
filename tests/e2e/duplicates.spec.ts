import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { importFile, skipWelcome, stubTiles } from './helpers';

type Rec = Record<string, unknown> & { id: string; stamps: Record<string, unknown> };

/** Two "Wm. Peck" people a year apart, and stones 3 and 4 moved 0.4 m apart with alike text. */
function withDuplicates() {
  const doc = makeStonesDocument({ rows: 1, perRow: 6 });
  const stones = doc.data.monuments as Rec[];
  const [first] = stones;
  const stamp = (doc.cemetery.stamps as Record<string, unknown>).name;
  const a = stones[2] as Rec & { position: { lng: number; lat: number; source: string } };
  const b = stones[3] as Rec & { position: { lng: number; lat: number; source: string } };
  b.position = { ...a.position, lat: a.position.lat + 0.4 / 110540, source: 'gps' };
  a.inscription = { text: 'In memory of Eliza Hale 1871' };
  b.inscription = { text: 'ELIZA HALE 1871' };
  const people = [
    { given: 'Wm.', surname: 'Peck', y: 1864, stone: 0 },
    { given: 'William', surname: 'Peck', y: 1865, stone: 5 },
    { given: 'Mary', surname: 'Peck', y: 1902, stone: 4 },
  ].map((p, i) => {
    const f = {
      name: { given: p.given, surname: p.surname },
      death: { original: String(p.y), y: p.y },
      monumentId: stones[p.stone]?.id,
    };
    return {
      id: `0193f1c2-0004-7000-8000-${String(i).padStart(12, '0')}`,
      cemeteryId: first?.cemeteryId,
      createdAt: first?.createdAt,
      ...f,
      stamps: Object.fromEntries(Object.keys(f).map((k) => [k, stamp])),
    };
  });
  doc.data.persons = people as never[];
  return doc;
}

test('duplicates: lists alike people and close stones; dismissing changes no data', async ({
  page,
}, testInfo) => {
  const file = testInfo.outputPath('duplicates.sbs.json');
  await writeFile(file, JSON.stringify(withDuplicates()));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: /^Possible duplicates/ }).click();

  const people = page.getByRole('list', { name: 'Possible duplicate people' });
  await expect(people.getByRole('listitem')).toHaveCount(1);
  await expect(people).toContainText('Wm. Peck');
  await expect(people).toContainText('William Peck');
  await expect(people).toContainText('Row 1, stone 1');
  await expect(people).toContainText('Row 1, stone 6');

  const stones = page.getByRole('list', { name: 'Possible duplicate stones' });
  await expect(stones.getByRole('listitem')).toHaveCount(1);
  await expect(stones).toContainText('0.4 m apart');

  await people.getByRole('button', { name: 'Not duplicates' }).click();
  await expect(page.getByText('No people look like duplicates.')).toBeVisible();
  await page.getByRole('button', { name: 'Show 1 dismissed pair' }).click();
  await people.getByRole('button', { name: 'Ask again' }).click();
  await expect(people.getByRole('button', { name: 'Not duplicates' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('list', { name: 'Possible duplicate people' })).toBeVisible();
});
