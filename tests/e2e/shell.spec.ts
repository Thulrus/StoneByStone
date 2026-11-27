import { expect, test } from '@playwright/test';

// The offline shell is the service worker's job.
test.use({ serviceWorkers: 'allow' });

test('hash routes survive a reload', async ({ page }) => {
  await page.goto('#/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('the theme choice persists across reloads', async ({ page }) => {
  await page.goto('#/settings');
  await page.getByRole('radio', { name: 'Sunlight (high contrast)' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sunlight');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'sunlight');
});

test('the shell loads with the network disabled', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Cemeteries' })).toBeVisible();

  // Wait for the service worker to install, precache, and take control of the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.goto('#/settings');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.goto('#/');
  await expect(page.getByRole('heading', { name: 'Cemeteries' })).toBeVisible();
});
