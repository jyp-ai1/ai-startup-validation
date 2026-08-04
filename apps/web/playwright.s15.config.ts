import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/s15-internal-qa.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 300_000,
  outputDir: '../../docs/evidence/S15/qa/playwright-output',
  use: {
    baseURL,
    locale: 'ko-KR',
    screenshot: 'on',
    video: { mode: 'off' },
    ...devices['Desktop Chrome'],
  },
});
