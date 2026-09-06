#!/usr/bin/env node
/**
 * Run DAY 8-D Phase B Answer-First Routing E2E (B1–B5).
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
  PLAYWRIGHT_E2E_HOST: 'localhost',
  V3_REVIEW_PIPELINE: 'true',
  NEXT_PUBLIC_V3_REVIEW_PIPELINE: 'true',
  NEXT_PUBLIC_AI_PM_FOCUSED_UI: 'true',
  AI_PM_FOCUSED_UI: 'true',
  AI_PM_JUDGMENT_POLICY_V1: 'true',
  NEXT_PUBLIC_AI_PM_JUDGMENT_POLICY_V1: 'true',
  AI_PM_ANSWER_FIRST_ROUTING_V1: 'true',
  NEXT_PUBLIC_AI_PM_ANSWER_FIRST_ROUTING_V1: 'true',
};

console.info('[day8d-phase-b] Building production bundle for E2E…');
const build = spawnSync('pnpm', ['run', 'build'], { cwd: webRoot, env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'playwright',
    'test',
    '-c',
    'playwright.v3-p0.config.ts',
    'e2e/day8d-phase-b-routing.spec.ts',
    '--retries=0',
  ],
  { cwd: webRoot, env, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
