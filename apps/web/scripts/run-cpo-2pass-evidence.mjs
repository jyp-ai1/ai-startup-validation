#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '../..');

function gitRev(args) {
  const r = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return r.stdout?.trim() ?? '';
}

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    'lib/ai-pm-accuracy/__tests__/cpo-2pass-evidence.test.ts',
    'lib/ai-pm-accuracy/__tests__/golden-scenarios-accuracy.test.ts',
    '--reporter=dot',
  ],
  {
    cwd: webRoot,
    encoding: 'utf8',
    shell: true,
    env: {
      ...process.env,
      CPO_2PASS_EVIDENCE: '1',
      ACCURACY_EVIDENCE: '1',
      ACCURACY_GIT_SHA: gitRev(['rev-parse', 'HEAD']),
      ACCURACY_GIT_BRANCH: gitRev(['branch', '--show-current']),
    },
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

const sha = gitRev(['rev-parse', 'HEAD']);
const sheetPath = path.resolve(
  repoRoot,
  'docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/CPO-2PASS-REVIEW-SHEET.md',
);
const jsonPath = path.resolve(
  repoRoot,
  'docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL/cpo-2pass-evidence-pack.json',
);
try {
  const sheet = fs.readFileSync(sheetPath, 'utf8');
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!sheet.includes(sha)) {
    console.error(`ERROR: Review Sheet missing HEAD SHA ${sha}`);
    process.exit(1);
  }
  if (json.gitSha !== sha) {
    console.error(`ERROR: JSON gitSha ${json.gitSha} !== HEAD ${sha}`);
    process.exit(1);
  }
  console.log(`OK: CPO 2-pass evidence @ ${sha}`);
} catch (e) {
  console.error('ERROR: evidence files missing after generate', e);
  process.exit(1);
}

process.exit(result.status ?? 1);
