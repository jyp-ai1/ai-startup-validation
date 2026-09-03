#!/usr/bin/env node
/**
 * Day 2+ — Post-push verification for feature/v3-baseline-recovery.
 * Run after CEO pushes V3 baseline from handoff machine.
 *
 * Usage:
 *   node scripts/verify-v3-baseline-recovery.mjs
 *   node scripts/verify-v3-baseline-recovery.mjs --branch feature/v3-baseline-recovery
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BRANCH = process.argv.includes('--branch')
  ? process.argv[process.argv.indexOf('--branch') + 1]
  : 'feature/v3-baseline-recovery';

const REQUIRED_MODULES = [
  'apps/web/features/workflow-journey/lib/business-understanding/build-answer-review.ts',
  'apps/web/features/workflow-journey/lib/business-understanding/update-gap-state-from-review.ts',
  'apps/web/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness.ts',
  'apps/web/features/workflow-journey/lib/business-understanding/decide-next-question-from-review.ts',
  'apps/web/features/workflow-journey/lib/business-understanding/v3-review-pipeline.ts',
  'apps/web/features/workflow-journey/lib/business-understanding/v3-legacy-bypass-guards.ts',
];

const REQUIRED_TESTS = [
  'apps/web/features/workflow-journey/lib/business-understanding/__tests__/ai-pm-loop-v3.test.ts',
  'apps/web/features/workflow-journey/lib/business-understanding/__tests__/v3-runtime-certification.test.ts',
];

const OPTIONAL_DOCS = [
  'docs/architecture/ai-pm-v3/gate-review/V3_LOGIC_FREEZE.md',
];

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function fileExistsOnRef(ref, filePath) {
  try {
    run(`git cat-file -e ${ref}:${filePath}`);
    return true;
  } catch {
    return false;
  }
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

console.log(`\n=== V3 Baseline Recovery Verification ===`);
console.log(`Branch: origin/${BRANCH}\n`);

let pass = 0;
let fail = 0;

function check(label, ok, detail = '') {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${label}${detail ? ` — ${detail}` : ''}`);
  if (ok) pass += 1;
  else fail += 1;
}

try {
  run('git fetch origin');
} catch (e) {
  check('git fetch origin', false, String(e.message ?? e));
  process.exit(1);
}

const ref = `origin/${BRANCH}`;
try {
  run(`git rev-parse ${ref}`);
  check('Remote branch exists', true, ref);
} catch {
  check('Remote branch exists', false, `${ref} not found — CEO push required`);
  console.log('\nResult: FAIL — push V3 baseline first.\n');
  process.exit(1);
}

const headSha = run(`git rev-parse ${ref}`);
check('HEAD SHA recorded', Boolean(headSha), headSha);

for (const file of REQUIRED_MODULES) {
  check(`Module: ${path.basename(file)}`, fileExistsOnRef(ref, file));
}

for (const file of REQUIRED_TESTS) {
  check(`Test: ${path.basename(file)}`, fileExistsOnRef(ref, file));
}

let docCount = 0;
for (const file of OPTIONAL_DOCS) {
  if (fileExistsOnRef(ref, file)) docCount += 1;
}
check('Gate docs (optional)', docCount > 0, `${docCount}/${OPTIONAL_DOCS.length} present`);

try {
  const log = run(`git log ${ref} --oneline -20`);
  const hasHistory = log.split('\n').length >= 3;
  check('Commit history traceable', hasHistory, `${log.split('\n').length} commits visible`);
} catch {
  check('Commit history traceable', false);
}

console.log(`\n--- Summary: ${pass} pass / ${fail} fail ---`);
if (fail === 0) {
  console.log('Day 2 remote verification: PASS — proceed to Day 3\n');
  process.exit(0);
}
console.log('Day 2 remote verification: FAIL — see missing items above\n');
process.exit(1);
