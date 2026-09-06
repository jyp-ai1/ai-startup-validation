#!/usr/bin/env node
/**
 * DAY 8-I — Run 30-turn conversation test and generate CTO report for CPO review.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '../..');

const env = {
  ...process.env,
  V3_REVIEW_PIPELINE: 'true',
  NEXT_PUBLIC_V3_REVIEW_PIPELINE: 'true',
  AI_PM_JUDGMENT_AGGREGATION_V1: 'true',
  NEXT_PUBLIC_AI_PM_JUDGMENT_AGGREGATION_V1: 'true',
  AI_PM_ANSWER_FIRST_ROUTING_V1: 'true',
  NEXT_PUBLIC_AI_PM_ANSWER_FIRST_ROUTING_V1: 'true',
  AI_PM_NO_ASK_POLICY_V1: 'true',
  NEXT_PUBLIC_AI_PM_NO_ASK_POLICY_V1: 'true',
  DAY8I_WRITE_REPORT: 'true',
};

console.info('[day8i] Running CPO-R1~R12 + 30-turn conversation tests…');
const test = spawnSync(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    'features/workflow-journey/lib/business-understanding/__tests__/day8i-judgment-trace.test.ts',
  ],
  { cwd: webRoot, env, stdio: 'inherit' },
);

if (test.status !== 0) {
  process.exit(test.status ?? 1);
}

const reportPath = path.join(repoRoot, 'docs/evidence/ALABOM/DAY_8I_CTO_30_TURN_REPORT.md');
if (fs.existsSync(reportPath)) {
  console.info(`[day8i] Report written: ${reportPath}`);
} else {
  console.warn('[day8i] Report file not found — DAY8I_WRITE_REPORT may not have triggered');
}

console.info('[day8i] Running DAY 8-H/G/F/D regression…');
const regression = spawnSync('node', ['scripts/run-day8h-e2e.mjs'], {
  cwd: webRoot,
  env,
  stdio: 'inherit',
});

process.exit(regression.status ?? 0);
