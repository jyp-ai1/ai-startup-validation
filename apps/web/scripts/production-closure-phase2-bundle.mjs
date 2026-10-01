/**
 * Closure Phase 2 — full Production evidence bundle (does not imply checklist PASS).
 *
 * Usage (apps/web):
 *   EXPECT_COMMIT=$(git rev-parse HEAD) node scripts/production-closure-phase2-bundle.mjs
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = `${__dirname}/..`;
const OUT = join(webRoot, '../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/PRODUCTION');

const commit =
  process.env.EXPECT_COMMIT?.trim() ||
  execSync('git rev-parse HEAD', { cwd: webRoot, encoding: 'utf8' }).trim();

const env = { ...process.env, EXPECT_COMMIT: commit };
const steps = [];

function run(name, cmd) {
  try {
    execSync(cmd, { cwd: webRoot, stdio: 'inherit', env });
    steps.push({ name, pass: true });
  } catch (e) {
    steps.push({ name, pass: false, error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

mkdirSync(OUT, { recursive: true });

run('reasoning-closure-e2e', 'node scripts/production-reasoning-closure-e2e.mjs');
run('track-f-smoke', 'node scripts/production-track-f-smoke.mjs');
run('production-eval-smoke', 'node scripts/run-production-eval-smoke.mjs');

const summary = {
  bundle: 'closure-phase2',
  commit,
  steps,
  finishedAt: new Date().toISOString(),
};
writeFileSync(join(OUT, 'phase2-bundle-summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ok: true, commit }, null, 2));
