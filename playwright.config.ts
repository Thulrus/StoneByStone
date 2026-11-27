import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // GitHub's runners have 4 vCPUs; more workers than that starve WebKit's software rendering.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['dot'], ['html', { open: 'never' }]] : 'dot',
  use: {
    baseURL: `http://localhost:${port}/StoneByStone/`,
    trace: 'retain-on-failure',
    // The service worker's "Ready to work offline" toast lands at a random moment and sits over
    // phone layouts; specs that test the worker opt back in with `test.use`.
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    // WebKit stands in for iOS Safari (plan §2.2).
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 15'] },
      // Linux WebKit draws the maps in software, so every step is several times slower.
      timeout: 60_000,
      expect: { timeout: 10_000 },
    },
  ],
  webServer: {
    // e2e runs against the production build, service worker included.
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/StoneByStone/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'ignore',
  },
});
