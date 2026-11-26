import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/**
 * Viewer frame rate on a real GPU at laptop retina density (#45: 60 fps on a laptop).
 * CI uses software GL, so this runs by hand on a machine with a GPU:
 *   VIEWER_FPS_MIN=55 npx playwright test -c playwright.gpu.config.ts photo-viewer
 */
export default defineConfig({
  ...base,
  projects: [
    {
      name: 'laptop-gpu',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        launchOptions: {
          args: [
            '--enable-gpu',
            '--use-angle=vulkan',
            '--enable-features=Vulkan',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
  ],
});
