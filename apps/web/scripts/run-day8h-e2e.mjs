#!/usr/bin/env node
/**
 * Run DAY 8-H Business Review E2E + 8-G/F/D regression.
 */
import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

function findFreePort(start = 3340) {
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
  NEXT_PUBLIC_AI_PM_FOCUSED_UI: 'false',
  AI_PM_FOCUSED_UI: 'false',
  AI_PM_JUDGMENT_POLICY_V1: 'true',
  NEXT_PUBLIC_AI_PM_JUDGMENT_POLICY_V1: 'true',
  AI_PM_ANSWER_FIRST_ROUTING_V1: 'true',
  NEXT_PUBLIC_AI_PM_ANSWER_FIRST_ROUTING_V1: 'true',
  AI_PM_NO_ASK_POLICY_V1: 'true',
  NEXT_PUBLIC_AI_PM_NO_ASK_POLICY_V1: 'true',
  AI_PM_RESEARCH_UX_V1: 'true',
  NEXT_PUBLIC_AI_PM_RESEARCH_UX_V1: 'true',
  AI_PM_ANSWER_TARGET_BINDING_V1: 'true',
  NEXT_PUBLIC_AI_PM_ANSWER_TARGET_BINDING_V1: 'true',
  AI_PM_JUDGMENT_AGGREGATION_V1: 'true',
  NEXT_PUBLIC_AI_PM_JUDGMENT_AGGREGATION_V1: 'true',
};

const specs = process.argv.slice(2).filter((a) => a.endsWith('.spec.ts'));
const defaultSpecs = [
  'e2e/day8h-business-review.spec.ts',
  'e2e/day8g-judgment-conversation.spec.ts',
  'e2e/day8f-question-causality.spec.ts',
  'e2e/day8d-phase-d-research-ux.spec.ts',
];

console.info('[day8h] Building production bundle for E2E…');
const build = spawnSync('pnpm', ['run', 'build'], { cwd: webRoot, env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

console.info(`[day8h] PLAYWRIGHT_E2E_PORT=${port}`);
const result = spawnSync(
  'pnpm',
  [
    'exec',
    'playwright',
    'test',
    '-c',
    'playwright.v3-p0.config.ts',
    ...(specs.length > 0 ? specs : defaultSpecs),
    '--retries=0',
  ],
  { cwd: webRoot, env, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
