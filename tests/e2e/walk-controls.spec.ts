import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { dismissToasts, importFile, skipWelcome, stubTiles } from './helpers';

test.use({
  geolocation: { longitude: -72.6, latitude: 43.5, accuracy: 5 },
  permissions: ['geolocation'],
});

/** A tiny real JPEG, so the photo pipeline has something to decode. */
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

/**
 * The row's slots in order, each the stone's creation number (1 = first made, from its
 * time-sortable id), `0` for a gap.
 */
async function rowOrder(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const open = indexedDB.open('stonebystone');
    const db = await new Promise<IDBDatabase>((r) => (open.onsuccess = () => r(open.result)));
    const all = await new Promise<
      { id: string; address?: { rowId?: string; rowIndex?: number }; deleted?: unknown }[]
    >((r) => {
      const q = db.transaction('monuments').objectStore('monuments').getAll();
      q.onsuccess = () => r(q.result as never);
    });
    db.close();
    const newest = [...all].sort((a, b) => (a.id < b.id ? 1 : -1))[0];
    const live = all.filter(
      (m) =>
        !m.deleted &&
        m.address?.rowIndex !== undefined &&
        m.address.rowId === newest?.address?.rowId,
    );
    const born = [...live].sort((a, b) => (a.id < b.id ? -1 : 1)).map((m) => m.id);
    const k = Math.max(...live.map((m) => m.address?.rowIndex ?? 0)) + 1;
    return Array.from({ length: k }, (_, i) => {
      const m = live.find((s) => s.address?.rowIndex === i);
      return m ? born.indexOf(m.id) + 1 : 0;
    });
  });
}

test('row controls: gap, skip, insert, reverse, reorder', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.addInitScript(() =>
    localStorage.setItem(
      'stonebystone:prefs',
      JSON.stringify({ state: { holdStillSeconds: 5 }, version: 1 }),
    ),
  );
  const file = testInfo.outputPath('one.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 1, perRow: 1 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();

  await page.getByRole('button', { name: 'Walk a row' }).click();
  const start = page.getByRole('dialog', { name: 'Walk a row' });
  await start.getByRole('radio', { name: 'New row' }).check();
  await start.getByLabel('Row name').fill('C');
  await start.getByRole('radio', { name: /Just name it/ }).check();
  await start.getByRole('button', { name: 'Start' }).click();
  const panel = page.getByRole('region', { name: 'Walk a row' });
  const controls = panel.getByRole('group', { name: 'Row controls' });

  const camera = page.getByRole('dialog', { name: /Row C · stone/ });
  const input = camera.getByTestId('camera-file');
  const photo = await jpeg(page);
  const shoot = async (n: number) => {
    await expect(camera).toHaveAccessibleName(`Row C · stone ${n}`);
    await input.setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: photo });
    await expect(camera.getByText(`Stone ${n} saved`)).toBeVisible({ timeout: 15_000 });
    await camera.getByRole('button', { name: 'Next stone' }).click();
  };

  // Stone 1, a gap, stone 3, then a skipped stone 4.
  await panel.getByRole('button', { name: 'Next stone' }).click();
  await camera.getByRole('button', { name: 'Phone camera' }).click();
  await shoot(1);
  await camera.getByRole('button', { name: 'Gap' }).click();
  await expect(camera.getByText('1 empty plot before it')).toBeVisible();
  await shoot(3);
  await camera.getByRole('button', { name: 'Skip' }).click();
  await expect(camera.getByText('Stone 4 skipped')).toBeVisible();
  await camera.getByRole('button', { name: 'Close camera' }).click();
  await expect(panel).toContainText('3 stones');
  expect(await rowOrder(page)).toEqual([1, 0, 2, 3]);

  // Insert after stone 1: it fills the gap. A second one shifts the rest.
  await controls.getByRole('button', { name: 'Insert…' }).click();
  await page
    .getByRole('dialog', { name: 'Insert a stone' })
    .getByRole('button', { name: 'After stone 1' })
    .click();
  await shoot(2);
  await shoot(3);
  await camera.getByRole('button', { name: 'Close camera' }).click();
  await expect(panel).toContainText('5 stones');
  expect(await rowOrder(page)).toEqual([1, 4, 5, 2, 3]);

  // Reverse, and undo it from the toast.
  await controls.getByRole('button', { name: 'Reverse direction' }).click();
  await expect.poll(() => rowOrder(page)).toEqual([3, 2, 5, 4, 1]);
  await expect(panel).toContainText('new stones go before stone 1');
  await page
    .getByRole('region', { name: /Notifications/ })
    .getByRole('button', { name: 'Undo' })
    .click();
  await expect.poll(() => rowOrder(page)).toEqual([1, 4, 5, 2, 3]);
  await expect(panel).not.toContainText('new stones go before stone 1');
  await dismissToasts(page);

  // Reorder: stone 1 one slot later, then undo.
  await controls.getByRole('button', { name: 'Reorder…' }).click();
  const reorder = page.getByRole('dialog', { name: 'Reorder stones' });
  await expect(reorder.getByRole('button', { name: 'Move stone 1 earlier' })).toBeDisabled();
  await reorder.getByRole('button', { name: 'Move stone 1 later' }).click();
  await expect.poll(() => rowOrder(page)).toEqual([4, 1, 5, 2, 3]);
  await reorder.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => rowOrder(page)).toEqual([1, 4, 5, 2, 3]);
  await reorder.getByRole('button', { name: 'Close' }).click();

  // The skipped stone shows as located (no photo) in the diagram.
  await panel.getByRole('button', { name: 'End walk' }).click();
  await page.getByRole('tab', { name: 'Diagram' }).click();
  await expect(page.getByRole('button', { name: 'Row C, stone 5: Located' })).toBeVisible();

  // Hold still (GPS averaging) places the skipped stone, with its accuracy shown.
  await page.getByRole('button', { name: 'Row C, stone 5: Located' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Hold still here (GPS)' }).click();
  const hold = page.getByRole('dialog', { name: 'Hold still' });
  await hold.getByRole('button', { name: 'Use this position' }).click({ timeout: 20_000 });
  await expect(sheet).toContainText('Position within about ±');

  // Stone 4 placed relative to its neighbour, stone 5 (default: the nearest in its row).
  await sheet.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Row C, stone 4: Photographed' }).click();
  await sheet.getByRole('button', { name: 'Place relative to…' }).click();
  const rel = page.getByRole('dialog', { name: 'Place relative to…' });
  await expect(rel.getByRole('combobox', { name: 'From' })).toHaveValue(/.+/);
  await expect(rel.getByRole('combobox', { name: 'From' }).locator('option:checked')).toHaveText(
    'Row C, stone 5',
  );
  await rel.getByRole('button', { name: '3', exact: true }).click();
  await rel.getByRole('button', { name: 'W', exact: true }).click();
  await rel.getByRole('button', { name: 'Place stone' }).click();
  await expect(rel).toHaveCount(0);
  await expect(page.getByRole('dialog')).toContainText('Position within about ±');
});

test('quick chips and quick name, with the surname carried over', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const file = testInfo.outputPath('one.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 1, perRow: 1 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('button', { name: 'Walk a row' }).click();
  const start = page.getByRole('dialog', { name: 'Walk a row' });
  await start.getByRole('radio', { name: 'New row' }).check();
  await start.getByLabel('Row name').fill('Q');
  await start.getByRole('radio', { name: /Just name it/ }).check();
  await start.getByRole('button', { name: 'Start' }).click();
  await page
    .getByRole('region', { name: 'Walk a row' })
    .getByRole('button', { name: 'Next stone' })
    .click();

  const camera = page.getByRole('dialog', { name: /Row Q · stone/ });
  await camera.getByRole('button', { name: 'Phone camera' }).click();
  const photo = await jpeg(page);
  const shoot = async (n: number) => {
    await camera
      .getByTestId('camera-file')
      .setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: photo });
    await expect(camera.getByText(`Stone ${n} saved`)).toBeVisible({ timeout: 15_000 });
  };
  await shoot(1);
  const tray = camera.getByRole('region', { name: 'Stone details' });
  const tab = (name: string) => tray.getByRole('tab', { name }).click();
  const chip = (name: string) => tray.getByRole('button', { name, exact: true });
  await expect(chip('Headstone')).toHaveAttribute('aria-pressed', 'true');
  await chip('Obelisk').click();
  await tab('Material');
  await chip('Slate').click();
  await tab('Condition');
  await chip('Tilted').click();
  await chip('Sunken').click();
  await tab('Flags');
  await chip('Needs revisit').click();
  await tab('Name');
  await tray.getByRole('textbox', { name: 'Name' }).fill('John Smith');
  await tray.getByRole('textbox', { name: 'Name' }).press('Enter');
  await tab('Type');
  await expect(chip('Obelisk')).toHaveAttribute('aria-pressed', 'true');
  await camera.getByRole('button', { name: 'Next stone' }).click();

  await shoot(2);
  await tab('Name');
  await tray.getByRole('button', { name: 'Same surname: Smith' }).click();
  await expect(tray.getByRole('textbox', { name: 'Name' })).toHaveValue('Smith');
  await camera.getByRole('button', { name: 'Close camera' }).click();

  const saved = await page.evaluate(async () => {
    const open = indexedDB.open('stonebystone');
    const db = await new Promise<IDBDatabase>((r) => (open.onsuccess = () => r(open.result)));
    const all = <T>(table: string) =>
      new Promise<T[]>((r) => {
        const q = db.transaction(table).objectStore(table).getAll();
        q.onsuccess = () => r(q.result as T[]);
      });
    const stones = await all<{
      id: string;
      kind: string;
      material?: string;
      condition?: string[];
      flags?: string[];
    }>('monuments');
    const people = await all<{ monumentId?: string; name: { surname?: string; given?: string } }>(
      'persons',
    );
    db.close();
    const first = [...stones].sort((a, b) => (a.id < b.id ? -1 : 1)).at(-2);
    return {
      first: first && {
        kind: first.kind,
        material: first.material,
        condition: first.condition,
        flags: first.flags,
      },
      names: people.map((p) => p.name).sort((a, b) => (a.given ?? '').localeCompare(b.given ?? '')),
    };
  });
  expect(saved.first).toEqual({
    kind: 'obelisk',
    material: 'slate',
    condition: ['sunken', 'tilted'],
    flags: ['needs-revisit'],
  });
  expect(saved.names).toEqual([
    { asCarved: 'Smith', surname: 'Smith' },
    expect.objectContaining({ given: 'John', surname: 'Smith' }),
  ]);
});
