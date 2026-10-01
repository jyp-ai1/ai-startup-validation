/**
 * Reasoning & Production Closure — Production browser bundle (Track A).
 *
 * Usage (apps/web):
 *   EXPECT_COMMIT=$(git rev-parse HEAD) node scripts/production-reasoning-closure-e2e.mjs
 */
import { execSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = `${__dirname}/..`;

const commit =
  process.env.EXPECT_COMMIT?.trim() ||
  execSync('git rev-parse HEAD', { cwd: webRoot, encoding: 'utf8' }).trim();

const env = { ...process.env, EXPECT_COMMIT: commit };

execSync('node scripts/production-gate1-demo-browser.mjs', {
  cwd: webRoot,
  stdio: 'inherit',
  env: {
    ...env,
    EVIDENCE_OUT_DIR: `${webRoot}/../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/PRODUCTION`,
  },
});

execSync('node scripts/production-historical-p0-browser.mjs', {
  cwd: webRoot,
  stdio: 'inherit',
  env,
});

console.log(JSON.stringify({ bundle: 'reasoning-closure-e2e', commit, ok: true }));
