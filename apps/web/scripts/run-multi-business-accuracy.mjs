#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    'lib/ai-pm-accuracy/__tests__/multi-business-harness.test.ts',
    '--reporter=dot',
  ],
  {
    cwd: webRoot,
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, MULTI_BUSINESS_EVIDENCE: '1' },
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
