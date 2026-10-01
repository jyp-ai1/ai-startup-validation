/**
 * Track E — 30-scenario eval matrix (local harness → evidence JSON).
 *
 * Usage (apps/web):
 *   node scripts/run-ai-eval-matrix.mjs
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const OUT = join(
  WEB_ROOT,
  '../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/EVAL',
);

const harness = 'lib/ai-evaluation/__tests__/ai-pm-scenario-harness.test.ts';

let vitestOk = false;
let vitestOutput = '';
try {
  vitestOutput = execSync(`pnpm exec vitest run ${harness}`, {
    cwd: WEB_ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  vitestOk = true;
} catch (e) {
  vitestOutput = `${e.stdout ?? ''}\n${e.stderr ?? ''}`;
}

const commit = execSync('git rev-parse HEAD', { cwd: WEB_ROOT, encoding: 'utf8' }).trim();

const report = {
  kind: 'ai-eval-matrix-local',
  commit,
  scenarioTarget: 30,
  harnessFile: harness,
  vitestPass: vitestOk,
  vitestTail: vitestOutput.slice(-1200),
  productionEval: 'NOT_RUN',
  note: 'Production AI eval requires deployed SHA + optional LLM; local harness = grounding + short conversation smoke.',
  finishedAt: new Date().toISOString(),
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'eval-matrix-result.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ vitestPass: vitestOk, commit }, null, 2));
process.exit(vitestOk ? 0 : 1);
