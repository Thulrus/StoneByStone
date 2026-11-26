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
});
