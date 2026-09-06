#!/usr/bin/env node
/**
 * DAY 8-I — Generate CPO Review Evidence Report (no E2E, report-only).
 * CPO must be able to independently review 30-turn verbatim trace.
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
};

console.info('[day8i] Generating CPO Review Evidence Report…');

const gen = spawnSync(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    'features/workflow-journey/lib/business-understanding/__tests__/day8i-generate-cpo-evidence.test.ts',
  ],
  { cwd: webRoot, env, stdio: 'inherit' },
);

if (gen.status !== 0) {
  process.exit(gen.status ?? 1);
}

const reportPath = path.join(repoRoot, 'docs/evidence/ALABOM/DAY_8I_CPO_EVIDENCE_REPORT.md');
if (!fs.existsSync(reportPath)) {
  console.error('[day8i] Report not found:', reportPath);
  process.exit(1);
}

const stat = fs.statSync(reportPath);
console.info(`[day8i] Report written: ${reportPath} (${stat.size} bytes)`);

console.info('[day8i] Running CPO-R1~R12 unit tests…');
const unit = spawnSync(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    'features/workflow-journey/lib/business-understanding/__tests__/day8i-judgment-trace.test.ts',
  ],
  { cwd: webRoot, env, stdio: 'inherit' },
);

process.exit(unit.status ?? 0);
