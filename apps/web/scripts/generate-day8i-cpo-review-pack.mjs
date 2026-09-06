#!/usr/bin/env node
/**
 * Generate DAY 8-I CPO REVIEW PACK (conversation-pasteable).
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
  AI_PM_JUDGMENT_AGGREGATION_V1: 'true',
  AI_PM_ANSWER_FIRST_ROUTING_V1: 'true',
  AI_PM_NO_ASK_POLICY_V1: 'true',
};

console.info('[day8i] Generating CPO REVIEW PACK…');
const gen = spawnSync(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    'features/workflow-journey/lib/business-understanding/__tests__/day8i-generate-cpo-review-pack.test.ts',
  ],
  { cwd: webRoot, env, stdio: 'inherit' },
);

if (gen.status !== 0) process.exit(gen.status ?? 1);

const packPath = path.join(repoRoot, 'docs/evidence/ALABOM/DAY_8I_CPO_REVIEW_PACK.md');
if (!fs.existsSync(packPath)) {
  console.error('[day8i] Pack not found:', packPath);
  process.exit(1);
}
console.info(`[day8i] Written: ${packPath} (${fs.statSync(packPath).size} bytes)`);

// Also print to stdout for CPO paste capture
console.info('\n========== CPO REVIEW PACK BEGIN ==========\n');
process.stdout.write(fs.readFileSync(packPath, 'utf8'));
console.info('\n========== CPO REVIEW PACK END ==========\n');
