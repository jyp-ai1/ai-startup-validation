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
    'lib/ai-pm-validation-engine/__tests__/longitudinal-adjudication.test.ts',
    '--reporter=dot',
  ],
  {
    cwd: webRoot,
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, LONGITUDINAL_ADJUDICATION_EVIDENCE: '1' },
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
