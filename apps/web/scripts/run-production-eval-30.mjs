/**
 * Track E — 30-scenario evaluation report (local harness + Production AI slot).
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const OUT = join(WEB_ROOT, '../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/EVAL');
const PRODUCTION_URL =
  process.env.PRODUCTION_URL ?? 'https://ai-startup-validation-tau.vercel.app';

async function main() {
  const gitSha = execSync('git rev-parse HEAD', { cwd: WEB_ROOT, encoding: 'utf8' }).trim();

  let harnessPass = false;
  try {
    execSync('pnpm exec vitest run lib/ai-evaluation/__tests__/ai-pm-scenario-harness.test.ts', {
      cwd: WEB_ROOT,
      stdio: 'pipe',
    });
    harnessPass = true;
  } catch {
    harnessPass = false;
  }

  let scenarioCount = 30;
  try {
    const src = readFileSync(join(WEB_ROOT, 'lib/ai-evaluation/scenarios.ts'), 'utf8');
    if (!src.includes('scenarios-pack-3')) scenarioCount = 0;
  } catch {
    scenarioCount = 0;
  }

  const health = await fetch(`${PRODUCTION_URL}/api/health`).then((r) => r.json()).then((j) => j?.data ?? j);

  const report = {
    gitSha,
    productionCommit: health.commit,
    shaMatch:
      health.commit === gitSha ||
      String(health.commit).startsWith(gitSha.slice(0, 7)) ||
      gitSha.startsWith(String(health.commit).slice(0, 7)),
    localHarness: {
      pass: harnessPass,
      scenarioTarget: 30,
      scenarioPackPresent: scenarioCount === 30,
      note: 'Grounding extraction via vitest — not Production LLM pipeline.',
    },
    productionAiEval: {
      status: 'NOT_RUN',
      reason:
        'No Production-safe batch LLM eval endpoint; per-scenario Production AI compare requires authenticated project loop or approved eval service.',
    },
    dimensions: {
      grounding: harnessPass ? 'PASS_LOCAL' : 'FAIL_LOCAL',
      slotAccuracy: harnessPass ? 'PASS_LOCAL' : 'FAIL_LOCAL',
      completeness: 'NOT_RUN_PRODUCTION',
      gapAccuracy: 'NOT_RUN_PRODUCTION',
      questionQuality: 'NOT_RUN_PRODUCTION',
      reasoning: 'NOT_RUN_PRODUCTION',
      actionability: 'NOT_RUN_PRODUCTION',
    },
    finishedAt: new Date().toISOString(),
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'production-eval-30-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ localHarness: harnessPass, productionAiEval: report.productionAiEval.status }, null, 2));
  process.exit(harnessPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
