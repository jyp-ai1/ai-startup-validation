#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '../..');

function gitRev(args) {
  const r = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  return r.stdout?.trim() ?? null;
}

const result = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', 'lib/ai-pm-accuracy/__tests__/validation-lab-runner.test.ts', '--reporter=dot'],
  {
    cwd: webRoot,
    encoding: 'utf8',
    shell: true,
    env: {
      ...process.env,
      VALIDATION_LAB_EVIDENCE: '1',
      ACCURACY_GIT_SHA: gitRev(['rev-parse', 'HEAD']),
    },
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
