import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { dismissToasts, importFile, skipWelcome, stubTiles } from './helpers';

/**
 * One row of 4 stones. Stone 4 has John Smith (d. 1890) transcribed; stone 3's inscription
 * reads JOHANN SCHMIDT but nobody is entered. The index lists John Smith, Johann Schmidt and
 * Ann Peck (no stone).
 */
function document() {
  const doc = makeStonesDocument({ rows: 1, perRow: 4 });
  const stones = doc.data.monuments as {
    id: string;
    cemeteryId: string;
    createdAt: string;
    inscription?: { text: string };
  }[];
  const [, , third, fourth] = stones;
  if (!third || !fourth) throw new Error('fixture');
  third.inscription = { text: 'HIER RUHT\nJOHANN SCHMIDT' };
  const stamp = (doc.cemetery.stamps as Record<string, unknown>).name;
  const person = (i: number, f: Record<string, unknown>) => ({
    id: `0193f1c2-0004-7000-8000-${String(i).padStart(12, '0')}`,
    cemeteryId: fourth.cemeteryId,
    createdAt: fourth.createdAt,
    ...f,
    stamps: Object.fromEntries(Object.keys(f).map((k) => [k, stamp])),
  });
  const index = (ref: string, row?: string) => ({
    matchStatus: 'unmatched',
    sources: [{ kind: 'imported-index', ref, ...(row ? { location: { row } } : {}) }],
  });
  doc.data.persons = [
    person(0, {
      monumentId: fourth.id,
      name: { asCarved: 'JOHN SMITH', given: 'JOHN', surname: 'SMITH' },
      death: { original: '1890', y: 1890 },
    }),
    person(1, {
      name: { given: 'John', surname: 'Smith' },
      death: { original: '1890', y: 1890 },
      birth: { original: '1820', y: 1820 },
      ...index('society.csv, 1', '1'),
    }),
    person(2, { name: { given: 'Johann', surname: 'Schmidt' }, ...index('society.csv, 2', '1') }),
    person(3, { name: { given: 'Ann', surname: 'Peck' }, ...index('society.csv, 3') }),
  ] as never[];
  return doc;
}

async function act(page: Page, button: string, card: string) {
  await page
    .getByRole('listitem', { name: card })
    .getByRole('button', { name: button })
    .first()
    .click();
  await dismissToasts(page);
}

test('match view: same person, on this stone, no stone found, unlink and undo', async ({
  page,
}, testInfo) => {
  const file = testInfo.outputPath('match.sbs.json');
  await writeFile(file, JSON.stringify(document()));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: /^Match index to stones/ }).click();

  const tab = (name: RegExp) => page.getByRole('tab', { name });
  await expect(tab(/To match \(3\)/)).toBeVisible();

  // John Smith: the carved John Smith on stone 4 is the top candidate.
  const john = page.getByRole('listitem', { name: 'John Smith' });
  await expect(john.getByRole('list').getByRole('listitem').first()).toContainText(
    'Row 1, stone 4',
  );
  await expect(john).toContainText('same name · same year · same place');
  await act(page, 'Same person', 'John Smith');

  // Johann Schmidt: found from stone 3's inscription.
  const johann = page.getByRole('listitem', { name: 'Johann Schmidt' });
  await expect(johann).toContainText('Row 1, stone 3');
  await expect(johann).toContainText('No one entered on this stone yet');
  await act(page, 'Put on Row 1, stone 3', 'Johann Schmidt');

  // Ann Peck: no stone, likely an unmarked grave.
  await expect(page.getByRole('listitem', { name: 'Ann Peck' })).toContainText(
    'It may be an unmarked or lost grave',
  );
  await act(page, 'No stone found', 'Ann Peck');
  await expect(tab(/To match \(0\)/)).toBeVisible();
  await expect(tab(/No stone found \(1\)/)).toBeVisible();
  await expect(tab(/Matched \(2\)/)).toBeVisible();

  // Unlink the merge, then undo the unlink.
  await tab(/Matched/).click();
  const matched = page.getByRole('list', { name: 'Matched records' });
  await expect(matched.getByRole('listitem', { name: 'John Smith' })).toContainText(
    'same person as JOHN SMITH',
  );
  await matched
    .getByRole('listitem', { name: 'John Smith' })
    .getByRole('button', { name: 'Unlink' })
    .click();
  await expect(tab(/To match \(1\)/)).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).first().click();
  await expect(tab(/Matched \(2\)/)).toBeVisible();
  await expect(tab(/To match \(0\)/)).toBeVisible();
});
