#!/usr/bin/env node
/**
 * Run DAY 8-B Phase 2 CEO UX verification E2E with Focused UI enabled.
 */
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

function findFreePort(start = 3299) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      findFreePort(start + 1).then(resolve);
    });
  });
}

const port = await findFreePort();
const env = {
  ...process.env,
  PLAYWRIGHT_E2E_PORT: String(port),
  PLAYWRIGHT_E2E_HOST: '127.0.0.1',
  V3_REVIEW_PIPELINE: 'true',
  NEXT_PUBLIC_V3_REVIEW_PIPELINE: 'true',
  NEXT_PUBLIC_AI_PM_FOCUSED_UI: 'true',
  AI_PM_FOCUSED_UI: 'true',
};

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'playwright',
    'test',
    '-c',
    'playwright.v3-p0.config.ts',
    'e2e/day8b-phase2-ceo-ux-verification.spec.ts',
    '--retries=0',
  ],
  {
    cwd: webRoot,
    env,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
