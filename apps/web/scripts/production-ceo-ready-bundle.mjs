/**
 * CEO-ready sprint — Production evidence orchestrator (does not imply full checklist PASS).
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

function run(name, cmd, optional = false) {
  try {
    execSync(cmd, { cwd: webRoot, stdio: 'inherit', env });
    steps.push({ name, pass: true, optional });
  } catch {
    steps.push({ name, pass: false, optional });
    if (!optional) throw new Error(`step failed: ${name}`);
  }
}

mkdirSync(OUT, { recursive: true });

run('phase2-closure-e2e', 'node scripts/production-closure-phase2-bundle.mjs');
run('auth-full-journey', 'node scripts/production-auth-full-journey.mjs', true);
run('document-parity', 'node scripts/production-document-parity-browser.mjs');
run('eval-30-report', 'node scripts/run-production-eval-30.mjs');

const summary = {
  bundle: 'ceo-ready',
  commit,
  steps,
  finishedAt: new Date().toISOString(),
};
writeFileSync(join(OUT, 'production-reasoning-closure-e2e.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ok: true, commit }, null, 2));
