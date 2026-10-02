#!/usr/bin/env node
/**
 * Build CPO Phase ② review pack from PRODUCTION/real-business-review-trace.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(webRoot, '../..');
const evidenceRoot = path.resolve(
  repoRoot,
  'docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1',
);
const traceFile = path.join(evidenceRoot, 'PRODUCTION/real-business-review-trace.json');

const result = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', 'lib/ai-pm-accuracy/__tests__/phase2-cpo-review-pack.test.ts', '--reporter=dot'],
  {
    cwd: webRoot,
    encoding: 'utf8',
    shell: true,
    env: {
      ...process.env,
      PHASE2_CPO_PACK: '1',
      PHASE2_TRACE_PATH: traceFile,
    },
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
