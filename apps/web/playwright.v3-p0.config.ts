import { defineConfig, devices } from '@playwright/test';

/**
 * PR8.5 — V3 P0 browser E2E config.
 *
 * Infra: dedicated E2E port (default 3199) — never 3000.
 * webServer `--port` and `baseURL` always use PLAYWRIGHT_E2E_PORT.
 * Run via: pnpm run test:e2e:v3-p0  (scripts/run-v3-p0-e2e.mjs picks a free port)
 *
 * Production spot-check: PLAYWRIGHT_BASE_URL + CI=1 (no webServer).
 */
const useProd = Boolean(process.env.PLAYWRIGHT_BASE_URL?.includes('vercel.app'));

const E2E_HOST = process.env.PLAYWRIGHT_E2E_HOST ?? '127.0.0.1';
const E2E_PORT = process.env.PLAYWRIGHT_E2E_PORT ?? '3199';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${E2E_HOST}:${E2E_PORT}`;
const healthURL = `${baseURL}/health`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 360_000,
  use: {
    baseURL,
    locale: 'ko-KR',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: useProd
    ? undefined
    : {
        command: `pnpm exec next dev --hostname ${E2E_HOST} --port ${E2E_PORT}`,
        url: healthURL,
        reuseExistingServer: false,
        timeout: 240_000,
        env: {
          ...process.env,
          PORT: E2E_PORT,
          HOSTNAME: E2E_HOST,
          NODE_OPTIONS: '--max-old-space-size=6144',
          V3_REVIEW_PIPELINE: 'true',
          NEXT_PUBLIC_V3_REVIEW_PIPELINE: 'true',
        },
      },
});
