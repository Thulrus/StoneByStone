import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { dismissToasts, importFile, skipWelcome, stubTiles } from './helpers';

const ORIGIN = { longitude: -72.6, latitude: 43.5 };
const M_LNG = 1 / (111320 * Math.cos((ORIGIN.latitude * Math.PI) / 180));
const M_LAT = 1 / 110540;

test.use({ geolocation: { ...ORIGIN, accuracy: 5 }, permissions: ['geolocation'] });

/** A real JPEG made by the browser, so the photo pipeline has something to decode. */
async function jpeg(page: Page, shade: number): Promise<Buffer> {
  const b64 = await page.evaluate((s) => {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 900;
    const g = c.getContext('2d');
    if (!g) throw new Error('no 2d');
    g.fillStyle = `rgb(${s},${s},${s})`;
    g.fillRect(0, 0, 1200, 900);
    g.fillStyle = '#eee';
    g.fillRect(450, 150, 300, 600);
    return c.toDataURL('image/jpeg', 0.9).split(',')[1] ?? '';
  }, shade);
  return Buffer.from(b64, 'base64');
}

/** A GPS fix `x` metres east of the start, with `dy` metres of sideways noise. */
const fixAt = (x: number, dy = 0) => ({
  longitude: ORIGIN.longitude + x * M_LNG,
  latitude: ORIGIN.latitude + dy * M_LAT,
  accuracy: 6,
});

test('walk a new row from a GPS start: stones in order, back photo, row end', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(90_000);
  const file = testInfo.outputPath('one.sbs.json');
  await writeFile(
    file,
    JSON.stringify(
      makeStonesDocument({
        rows: 1,
        perRow: 2,
        origin: [ORIGIN.longitude, ORIGIN.latitude + 0.001],
      }),
    ),
  );
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();

  await page.getByRole('button', { name: 'Walk a row' }).click();
  const start = page.getByRole('dialog', { name: 'Walk a row' });
  await start.getByRole('radio', { name: 'New row' }).check();
  await start.getByLabel('Row name').fill('W');
  await start.getByRole('button', { name: 'Row start here' }).click();
  const panel = page.getByRole('region', { name: 'Walk a row' });
  await expect(panel).toContainText('Walking row W · 0 stones');

  await panel.getByRole('button', { name: 'Next stone' }).click();
  const camera = page.getByRole('dialog', { name: /Row W · stone/ });
  await camera.getByRole('button', { name: 'Phone camera' }).click();
  const input = camera.getByTestId('camera-file');

  // Noisy fixes: stone 3's fix lands behind stone 2's, but order must hold.
  const fixes = [fixAt(1, 2), fixAt(5, -3), fixAt(4, 4), fixAt(9, -1)];
  for (const [i, fix] of fixes.entries()) {
    await context.setGeolocation(fix);
    await input.setInputFiles({
      name: `s${i}.jpg`,
      mimeType: 'image/jpeg',
      buffer: await jpeg(page, 60 + i * 30),
    });
    await expect(camera.getByText('Saving…')).toHaveCount(0, { timeout: 15_000 });
    await expect(camera.getByRole('radio', { name: 'Back' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(camera).toHaveAccessibleName(`Row W · stone ${i + 1}`);
    if (i === 0) {
      await input.setInputFiles({
        name: 'back.jpg',
        mimeType: 'image/jpeg',
        buffer: await jpeg(page, 200),
      });
      await expect(camera.getByText('Saving…')).toHaveCount(0, { timeout: 15_000 });
    }
    await camera.getByRole('button', { name: 'Next stone' }).click();
    await expect(camera).toHaveAccessibleName(`Row W · stone ${i + 2}`);
  }
  // A fifth stone, undone from inside the camera.
  await input.setInputFiles({
    name: 'x.jpg',
    mimeType: 'image/jpeg',
    buffer: await jpeg(page, 90),
  });
  await expect(camera.getByText('Stone 5 saved')).toBeVisible({ timeout: 15_000 });
  await camera.getByRole('button', { name: 'Undo' }).click();
  await expect(camera).toHaveAccessibleName('Row W · stone 5');
  await expect(camera.getByRole('radio', { name: 'Front' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await camera.getByRole('button', { name: 'Close camera' }).click();
  await expect(panel).toContainText('4 stones');
  await dismissToasts(page);

  await context.setGeolocation(fixAt(12));
  await panel.getByRole('button', { name: 'Row end here' }).click();
  await expect(
    page.getByRole('region', { name: /Notifications/ }).getByText('Row end set; stones re-spaced'),
  ).toBeVisible();
  await dismissToasts(page);
  await panel.getByRole('button', { name: 'End walk' }).click();
  const summary = page.getByRole('dialog', { name: 'Row W done' });
  await expect(summary).toContainText('4 stones captured');
  await expect(summary).toContainText('5 photos');
  await expect(summary).toContainText('Row end set');
  await expect(summary.getByRole('button', { name: 'Back up now' })).toBeVisible();
  await summary.getByRole('button', { name: 'Done' }).click();

  // Positions along the row increase with the stone number.
  const order = await page.evaluate(async () => {
    const open = indexedDB.open('stonebystone');
    const db = await new Promise<IDBDatabase>((r) => (open.onsuccess = () => r(open.result)));
    const all = await new Promise<
      {
        address?: { rowIndex?: number; rowId?: string };
        position?: { lng: number };
        deleted?: unknown;
      }[]
    >((r) => {
      const q = db.transaction('monuments').objectStore('monuments').getAll();
      q.onsuccess = () => r(q.result as never);
    });
    db.close();
    return all
      .filter((m) => !m.deleted && m.position && m.address?.rowIndex !== undefined)
      .map((m) => ({
        row: m.address?.rowId,
        i: m.address?.rowIndex ?? 0,
        lng: m.position?.lng ?? 0,
      }));
  });
  const walked = order
    .filter((o) => o.row === order.find((x) => x.i === 3)?.row)
    .sort((a, b) => a.i - b.i);
  expect(walked).toHaveLength(4);
  // The first fix was 1 m along: GPS was used, not just even spacing (that would put it at 0).
  const lngs = walked.map((w) => w.lng);
  expect(lngs[0]).toBeGreaterThan(ORIGIN.longitude + 0.6 * M_LNG);
  expect([...lngs].sort((a, b) => a - b)).toEqual(lngs);
  expect(new Set(lngs).size).toBe(4);

  await page.getByRole('tab', { name: 'Diagram' }).click();
  for (let n = 1; n <= 4; n++)
    await expect(
      page.getByRole('button', { name: `Row W, stone ${n}: Photographed` }),
    ).toBeVisible();
  await page.getByRole('button', { name: 'Row W, stone 1: Photographed' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('img', { name: 'Front photo' })).toBeVisible();
  await expect(sheet.getByRole('img', { name: 'Back photo' })).toBeVisible();
});
