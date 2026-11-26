import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { importFile, skipWelcome, stubTiles } from './helpers';

test('desk mode: a queue in row order, save & next fast, saved text kept', async ({
  page,
}, testInfo) => {
  const file = testInfo.outputPath('queue.sbs.json');
  // Per row: stones 1–2 have no inscription and no photo; 3–4 are transcribed.
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 2, perRow: 4 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('link', { name: 'Transcribe' }).click();

  // Default list: photographed, not transcribed. Nothing here has a photo.
  await expect(page.getByText('No stones in this list.')).toBeVisible();
  await page.getByLabel('Show').selectOption({ label: 'No photo yet' });
  const form = page.getByRole('form', { name: 'Transcription' });
  const heading = form.getByRole('heading', { level: 2 });
  await expect(heading).toHaveText('Row 1, stone 1');
  await expect(form).toContainText('1 of 4');
  await expect(page.getByRole('list', { name: 'Neighbours in the row' })).toContainText('Stone 2');

  const box = form.getByLabel('Inscription, as carved');
  await expect(box).toBeFocused();
  await box.fill('IN MEMORY OF\nJOHN SMITH');

  // Save & next, timed inside the page: click to the next stone's heading on screen.
  const ms = await page.evaluate(async () => {
    const h = document.querySelector('form[aria-label="Transcription"] h2');
    const button = [...document.querySelectorAll('button')].find(
      (b) => b.textContent === 'Save & next',
    );
    if (!h || !button) throw new Error('missing form');
    const t0 = performance.now();
    button.click();
    for (;;) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = document.querySelector('form[aria-label="Transcription"] h2');
      if (now?.textContent === 'Row 1, stone 2') return performance.now() - t0;
    }
  });
  expect(ms).toBeLessThanOrEqual(100);
  await expect(form).toContainText('2 of 4');
  await expect(box).toBeFocused();
  await expect(box).toHaveValue('');

  // The saved stone keeps its place in the list, with its text and new status.
  await form.getByRole('button', { name: 'Previous' }).click();
  await expect(heading).toHaveText('Row 1, stone 1');
  await expect(box).toHaveValue('IN MEMORY OF\nJOHN SMITH');
  await expect(form).toContainText('Transcribed');

  // Next row follows the first; the end of the list says so.
  for (const h of ['Row 1, stone 2', 'Row 2, stone 1', 'Row 2, stone 2']) {
    await form.getByRole('button', { name: 'Save & next' }).click();
    await expect(heading).toHaveText(h);
  }
  await form.getByRole('button', { name: 'Save & next' }).click();
  await expect(page.getByText("That's the end of the list.")).toBeVisible();
});

test('the stone sheet opens desk mode on that stone', async ({ page }, testInfo) => {
  const file = testInfo.outputPath('one.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 1, perRow: 4 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('tab', { name: 'Diagram' }).click();
  await page.getByRole('button', { name: /^Row 1, stone 3:/ }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Transcribe' }).click();
  const form = page.getByRole('form', { name: 'Transcription' });
  await expect(form.getByRole('heading', { level: 2 })).toHaveText('Row 1, stone 3');
  // Not in the default list (it's transcribed), so the list widens to all stones.
  await expect(page.getByLabel('Show')).toHaveValue('all');
  await expect(form.getByLabel('Inscription, as carved')).toHaveValue('Stone 3');
});

test('a whole stone transcribed without the mouse', async ({ page }, testInfo) => {
  const file = testInfo.outputPath('kbd.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 1, perRow: 2 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('link', { name: 'Transcribe' }).click();
  await page.getByLabel('Show').selectOption({ label: 'No photo yet' });
  const form = page.getByRole('form', { name: 'Transcription' });
  await expect(form.getByRole('heading', { level: 2 })).toHaveText('Row 1, stone 1');

  const k = page.keyboard;
  const box = form.getByLabel('Inscription, as carved');
  await expect(box).toBeFocused();
  await k.type('IN MEMORY OF');
  await k.press('Enter'); // a real line break in the inscription
  await k.type('MARY ');
  await k.press('Control+i');
  await k.type(' BROWN');
  await k.press('Tab');
  await k.type('Mary Brown');
  await k.press('Control+.');
  await k.press('Tab');
  await k.type('1810');
  await k.press('Tab');
  await k.type('Mar. 3, 1850');
  await k.press('Control+.');
  await expect(form.getByText('about March 3, 1850', { exact: true })).toBeVisible();
  await k.press('Tab');
  await k.type('40 yrs');
  await k.press('Tab');
  await k.type('wife of John');
  await k.press('Control+Enter'); // save, and a second person
  const p2 = form.getByRole('group', { name: 'Person 2' });
  await expect(p2.getByLabel('Name, as carved')).toBeFocused();
  await k.type('John Brown');
  await k.press('Enter'); // save & next
  await expect(form.getByRole('heading', { level: 2 })).toHaveText('Row 1, stone 2');

  await form.getByRole('button', { name: 'Previous' }).click();
  await expect(box).toHaveValue('IN MEMORY OF\nMARY [illegible] BROWN');
  const p1 = form.getByRole('group', { name: 'Person 1' });
  await expect(p1.getByLabel('Name, as carved')).toHaveValue('Mary Brown[?]');
  await expect(p1.getByLabel('Died')).toHaveValue('Mar. 3, 1850?');
  await expect(p1.getByLabel('Age')).toHaveValue('40 yrs');
  await expect(p1.getByLabel('Relationship')).toHaveValue('wife of John');
  await expect(p2.getByLabel('Name, as carved')).toHaveValue('John Brown');
  await expect(form.getByRole('group', { name: 'Person 3' })).toHaveCount(0);
});

test("a couple's stone and their son's stone, linked both ways", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const file = testInfo.outputPath('family.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 1, perRow: 2 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('link', { name: 'Transcribe' }).click();
  await page.getByLabel('Show').selectOption({ label: 'No photo yet' });
  const form = page.getByRole('form', { name: 'Transcription' });
  const person = (n: number) => form.getByRole('group', { name: `Person ${n}` });
  const links = (n: number) => person(n).getByRole('list', { name: 'Linked people' });
  const linkTo = async (n: number, type: string, who: RegExp) => {
    await person(n).getByRole('button', { name: 'Link to a person…' }).click();
    const dialog = page.getByRole('dialog', { name: /^Link .* to…$/ });
    await expect(dialog.getByRole('radio', { name: type })).toBeChecked(); // from the carving
    await dialog.getByRole('list', { name: 'People' }).getByRole('button').first().click();
    await expect(dialog).toBeHidden();
    await expect(links(n)).toContainText(who);
  };

  // Stone 1: a couple.
  await person(1).getByLabel('Name, as carved').fill('John Brown');
  await form.getByRole('button', { name: 'Add another person' }).click();
  await person(2).getByLabel('Name, as carved').fill('Mary Brown');
  await person(2).getByLabel('Relationship').fill('wife of John Brown');
  await linkTo(2, 'Spouse', /Spouse: John Brown/);
  await expect(links(1)).toContainText('Spouse: Mary Brown');
  await form.getByRole('button', { name: 'Save & next' }).click();

  // Stone 2: their son. Suggestions follow the carved names.
  await expect(form.getByRole('heading', { level: 2 })).toHaveText('Row 1, stone 2');
  await person(1).getByLabel('Name, as carved').fill('Amos Brown');
  await person(1).getByLabel('Relationship').fill('son of John & Mary');
  await linkTo(1, 'Parent', /Parent: John Brown \(Row 1, stone 1\)/);
  await person(1).getByRole('button', { name: 'Link to a person…' }).click();
  const dialog = page.getByRole('dialog', { name: /^Link .* to…$/ });
  await dialog.getByLabel('Find by name').fill('mary');
  await dialog.getByRole('button', { name: /Mary Brown/ }).click();
  await expect(links(1)).toContainText('Parent: Mary Brown');

  // Back on stone 1, the parents see their child.
  await form.getByRole('button', { name: 'Previous' }).click();
  await expect(links(1)).toContainText('Child: Amos Brown');
  await expect(links(2)).toContainText('Child: Amos Brown');

  // Unlinking and removing keep both sides in step.
  await links(1).getByRole('button', { name: 'Unlink Mary Brown' }).click();
  await expect(links(2)).not.toContainText('Spouse');
  await form.getByRole('button', { name: 'Save & next' }).click();
  await person(1).getByRole('button', { name: 'Remove person 1' }).click();
  await form.getByRole('button', { name: 'Previous' }).click();
  await expect(links(1)).toHaveCount(0);
  await expect(links(2)).toHaveCount(0);
});
