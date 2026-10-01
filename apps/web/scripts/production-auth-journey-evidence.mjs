/**
 * Track A — Auth journey evidence (smoke always; full journey when QA profile exists).
 *
 * Usage (apps/web):
 *   node scripts/production-auth-journey-evidence.mjs
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const OUT = join(
  WEB_ROOT,
  '../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/PRODUCTION',
);
const PROFILE_DIR = join(WEB_ROOT, '.qa-chrome-profile');
const STORAGE_STATE = join(WEB_ROOT, '.qa-auth/storageState.json');

const report = {
  unauthenticatedSmoke: { pass: false, error: null },
  fullJourney: {
    status: 'NOT_RUN',
    reason: null,
    flow1: null,
    flow2: null,
  },
  commit: process.env.EXPECT_COMMIT ?? null,
  finishedAt: null,
};

async function main() {
  mkdirSync(OUT, { recursive: true });

  try {
    execSync('node scripts/production-authenticated-gate-smoke.mjs', {
      cwd: WEB_ROOT,
      stdio: 'pipe',
    });
    report.unauthenticatedSmoke.pass = true;
  } catch (e) {
    report.unauthenticatedSmoke.error = e instanceof Error ? e.message : String(e);
  }

  const hasProfile = existsSync(PROFILE_DIR) || existsSync(STORAGE_STATE);
  if (!hasProfile) {
    report.fullJourney.status = 'BLOCKED';
    report.fullJourney.reason =
      'CTO Google profile missing (.qa-chrome-profile or .qa-auth/storageState.json). Run production-flow-qa.mjs locally.';
  } else {
    try {
      const out = execSync('node scripts/production-flow-qa.mjs', {
        cwd: WEB_ROOT,
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 600_000,
      });
      report.fullJourney.status = 'PASS';
      report.fullJourney.rawTail = out.slice(-800);
    } catch (e) {
      report.fullJourney.status = 'FAIL';
      report.fullJourney.reason = e instanceof Error ? e.message : String(e);
      if (e && typeof e === 'object' && 'stdout' in e) {
        report.fullJourney.rawTail = String(e.stdout).slice(-800);
      }
    }
  }

  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, 'auth-journey-status.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ unauthenticatedSmoke: report.unauthenticatedSmoke.pass, fullJourney: report.fullJourney.status }, null, 2));

  const exitOk =
    report.unauthenticatedSmoke.pass &&
    (report.fullJourney.status === 'PASS' || report.fullJourney.status === 'BLOCKED');
  process.exit(exitOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
