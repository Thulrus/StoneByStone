import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { makeStonesDocument } from '../fixtures/stones';
import { importFile, skipWelcome, stubTiles } from './helpers';

async function jpeg(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1600;
    c.height = 1200;
    const g = c.getContext('2d');
    if (!g) throw new Error('no 2d');
    g.fillStyle = '#777';
    g.fillRect(0, 0, 1600, 1200);
    g.fillStyle = '#666';
    g.font = '192px serif';
    g.fillText('JOHN SMITH', 160, 480);
    return c.toDataURL('image/jpeg', 0.95).split(',')[1] ?? '';
  });
  return Buffer.from(b64, 'base64');
}

/** Grey level at the canvas point (fx, fy), as fractions of its size. */
const sample = (page: Page, fx: number, fy: number) =>
  page.evaluate(
    ([x, y]) => {
      const c = document.querySelector<HTMLCanvasElement>('canvas[data-renderer="webgl"]');
      if (!c) throw new Error('no canvas');
      const g = document.createElement('canvas').getContext('2d');
      if (!g) throw new Error('no 2d');
      g.canvas.width = c.width;
      g.canvas.height = c.height;
      g.drawImage(c, 0, 0);
      return g.getImageData(Math.floor(c.width * x), Math.floor(c.height * y), 1, 1).data[0] ?? -1;
    },
    [fx, fy],
  );

test('photo viewer: WebGL enhancement, live and non-destructive', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const file = testInfo.outputPath('one.sbs.json');
  await writeFile(file, JSON.stringify(makeStonesDocument({ rows: 1, perRow: 1 })));
  await stubTiles(page);
  await page.goto('./');
  await skipWelcome(page);
  await importFile(page, file);
  await page.getByRole('list', { name: 'Cemeteries on this device' }).getByRole('link').click();
  await page.getByRole('tab', { name: 'Diagram' }).click();
  await page.getByRole('button', { name: /^Row 1, stone 1:/ }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'All details' }).click();
  const photos = page.getByRole('region', { name: 'Photos' });
  await photos.getByRole('button', { name: 'Add photo' }).click();
  const camera = page.getByRole('dialog', { name: /Row 1, stone 1/ });
  await camera.getByRole('button', { name: 'Phone camera' }).click();
  await camera
    .getByTestId('camera-file')
    .setInputFiles({ name: 'p.jpg', mimeType: 'image/jpeg', buffer: await jpeg(page) });
  await expect(photos.getByRole('img', { name: 'Front photo' })).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Escape');

  await page.goto(page.url().replace(/\/stone\/.*/, '/transcribe'));
  const viewer = page.locator('canvas[data-renderer="webgl"][data-drawn]');
  await expect(viewer).toBeVisible();
  await expect.poll(() => sample(page, 0.5, 0.7)).toBeLessThan(135);
  const plain = await sample(page, 0.5, 0.7);
  expect(plain).toBeLessThan(135);

  await page.getByRole('button', { name: 'Enhance' }).click();
  await page.getByRole('button', { name: 'Invert' }).click();
  await expect.poll(() => sample(page, 0.5, 0.7)).toBeGreaterThan(255 - plain - 6);
  await expect(page.getByRole('button', { name: 'Enhance (on)' })).toBeVisible();

  // Interactive: drive a slider every frame and count frames drawn per second.
  await page.getByRole('button', { name: 'Weathered marble' }).click();
  const fps = await page.evaluate(async () => {
    const slider = [...document.querySelectorAll('label')]
      .find((l) => l.textContent?.startsWith('Local contrast'))
      ?.parentElement?.querySelector('input');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!slider || !set) throw new Error('no slider');
    const frames = 90;
    const t0 = performance.now();
    for (let i = 0; i < frames; i++) {
      set.call(slider, String((i % 50) / 50));
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((r) => requestAnimationFrame(r));
    }
    return (frames * 1000) / (performance.now() - t0);
  });
  testInfo.annotations.push({ type: 'fps', description: fps.toFixed(1) });
  console.log(`viewer fps (${testInfo.project.name}): ${fps.toFixed(1)}`);
  // CI draws with software GL, so only check it keeps drawing. The 60 fps bar (#45) is checked
  // on a real GPU: VIEWER_FPS_MIN=55 with a GPU-enabled project (see PROGRESS.md).
  expect(fps).toBeGreaterThan(Number(process.env.VIEWER_FPS_MIN ?? 1));

  // Zoom in on the lettering, then back to fit.
  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Fit' }).click();
  await expect.poll(() => sample(page, 0.5, 0.7)).toBeLessThan(135);
});
