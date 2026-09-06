#!/usr/bin/env node
/**
 * DAY 8-I — Generate CPO Evidence + run unit tests.
 * Does NOT run E2E (CPO review first).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, '..');

const result = spawnSync('node', ['scripts/generate-day8i-cpo-evidence.mjs'], {
  cwd: webRoot,
  stdio: 'inherit',
});

process.exit(result.status ?? 0);
