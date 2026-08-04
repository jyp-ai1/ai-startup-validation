import { defineConfig, devices } from '@playwright/test';

/** S14 Live Walkthrough — RC localhost only */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/s14-live-walkthrough.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 240_000,
  outputDir: '../../docs/evidence/S14/media/playwright-output',
  use: {
    baseURL,
    locale: 'ko-KR',
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    screenshot: 'on',
    trace: 'off',
    ...devices['Desktop Chrome'],
  },
});
