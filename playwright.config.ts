import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

// In the cloud container Chromium is preinstalled here; in CI Playwright's own download is used.
const localChromium = '/opt/pw-browsers/chromium';

export const chromiumArgs = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--autoplay-policy=no-user-gesture-required',
];

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      args: chromiumArgs,
      ...(existsSync(localChromium) ? { executablePath: localChromium } : {}),
    },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
