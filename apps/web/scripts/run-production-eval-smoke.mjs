/**
 * Track E — Production smoke: health + commit + local harness re-run at same git SHA.
 * Does NOT invoke live LLM; labels productionEval explicitly.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const OUT = join(WEB_ROOT, '../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/EVAL');
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';

const gitSha = execSync('git rev-parse HEAD', { cwd: WEB_ROOT, encoding: 'utf8' }).trim();

async function fetchHealth() {
  const res = await fetch(`${PRODUCTION_URL}/api/health`);
  const json = await res.json();
  return json?.data ?? json;
}

const health = await fetchHealth();
const shaMatch =
  health.commit === gitSha ||
  health.commit?.startsWith(gitSha.slice(0, 7)) ||
  gitSha.startsWith(String(health.commit).slice(0, 7));

let harnessPass = false;
try {
  execSync('node scripts/run-ai-eval-matrix.mjs', { cwd: WEB_ROOT, stdio: 'pipe' });
  harnessPass = true;
} catch {
  harnessPass = false;
}

const report = {
  kind: 'production-eval-smoke',
  gitSha,
  productionCommit: health.commit,
  shaMatch,
  harnessPassAtGitSha: harnessPass,
  productionAiEval: 'NOT_RUN',
  status: shaMatch && harnessPass ? 'PARTIAL' : 'FAIL',
  finishedAt: new Date().toISOString(),
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'production-eval-smoke.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.status === 'PARTIAL' ? 0 : 1);
