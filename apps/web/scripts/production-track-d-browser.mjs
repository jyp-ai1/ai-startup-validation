/**
 * Track D — Production judgment trace (authenticated loop required).
 * Writes honest BLOCKED evidence when QA profile is unavailable.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(__dirname, '..');
const OUT = join(WEB_ROOT, '../../docs/evidence/ALABOM/AI-REASONING-CLOSURE-SPRINT/PRODUCTION');
const PROFILE = join(WEB_ROOT, '.qa-chrome-profile');
const STORAGE = join(WEB_ROOT, '.qa-auth/storageState.json');

const report = {
  status: 'BLOCKED',
  reason:
    'Authenticated Production loop required for judgment trace; run production-flow-qa.mjs with CTO Google profile.',
  hasQaProfile: existsSync(PROFILE) || existsSync(STORAGE),
  trackDProductionPass: false,
  finishedAt: new Date().toISOString(),
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'track-d-production.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, hasQaProfile: report.hasQaProfile }, null, 2));
process.exit(0);
