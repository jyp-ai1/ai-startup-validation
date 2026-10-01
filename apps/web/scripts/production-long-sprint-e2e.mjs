/**
 * Long Sprint I — Production Demo + isolation E2E (wraps Gate 1 browser script).
 *
 * Usage (from apps/web):
 *   EXPECT_COMMIT=$(git rev-parse HEAD) node scripts/production-long-sprint-e2e.mjs
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../../../docs/evidence/ALABOM/LONG-SPRINT/PRODUCTION');

const commit =
  process.env.EXPECT_COMMIT?.trim() ||
  execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

process.env.EVIDENCE_OUT_DIR = outDir;
process.env.EXPECT_COMMIT = commit;

execSync('node scripts/production-gate1-demo-browser.mjs', {
  cwd: __dirname + '/..',
  stdio: 'inherit',
  env: process.env,
});
