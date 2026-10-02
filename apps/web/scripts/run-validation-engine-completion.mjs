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

const sha = gitRev(['rev-parse', 'HEAD']);

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    'lib/ai-pm-validation-engine/__tests__/validation-engine-completion.test.ts',
    '--reporter=dot',
  ],
  {
    cwd: webRoot,
    encoding: 'utf8',
    shell: true,
    env: {
      ...process.env,
      VALIDATION_ENGINE_COMPLETION: '1',
      ACCURACY_GIT_SHA: sha,
    },
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
