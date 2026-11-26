import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { stubTiles, tapMap, skipWelcome, importFile } from './helpers';

test('10,000 stones import, draw, and open in the sheet when tapped', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const file = testInfo.outputPath('stones.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument()));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);

  await importFile(page, file, 60_000);
  const list = page.getByRole('list', { name: 'Cemeteries on this device' });
  await expect(list.getByRole('link')).toHaveCount(1, { timeout: 60_000 });
  await list.getByRole('link').click();

  await expect(page.getByRole('tab', { name: 'Map' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('list', { name: 'Status key' })).toBeVisible();
  // The stones fill the view, so the middle of the map is on (or within a tap of) a stone.
  // The worker indexes 10,000 points after the map loads; retry until the tap lands on one.
  const sheet = page.getByRole('dialog');
  await expect(async () => {
    await tapMap(page, 0.5, 0.5);
    await expect(sheet).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await expect(sheet).toContainText(/Row \d+, stone \d+/);
  // The sheet and its backdrop cover the map's own buttons.
  const box = await page
    .getByRole('button', { name: 'Imagery', includeHidden: true })
    .boundingBox();
  if (!box) throw new Error('no Imagery button');
  const onTop = await page.evaluate(
    ([x, y]) => {
      // A modal sets pointer-events: none on the page, which hit-testing would skip.
      document.body.style.pointerEvents = 'auto';
      return document.elementFromPoint(x, y)?.closest('button')?.textContent ?? null;
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(onTop).not.toBe('Imagery');
});
