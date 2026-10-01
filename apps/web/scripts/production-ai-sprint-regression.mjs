/**
 * AI Long Sprint — local vitest bundle + Production demo E2E (no CPO gate).
 *
 * Usage (apps/web):
 *   node scripts/production-ai-sprint-regression.mjs
 */
import { execSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = `${__dirname}/..`;

const vitestFiles = [
  'lib/project/__tests__/demo-playback-frames.test.ts',
  'lib/project/__tests__/demo-gate1-isolation.test.ts',
  'lib/project/__tests__/long-document-intake-parity.test.ts',
  'lib/project/__tests__/extract-document-entities-customer.test.ts',
  'lib/ai-evaluation/__tests__/grounding-contamination.test.ts',
  'lib/ai-evaluation/__tests__/ai-pm-scenario-harness.test.ts',
  'lib/project/__tests__/p0-authenticated-persistence.test.ts',
  'features/workflow-journey/lib/business-understanding/__tests__/p0-3-demo-hydration.test.ts',
  'features/workflow-journey/lib/business-understanding/__tests__/w12-partial-closeout.test.ts',
  'features/workflow-journey/lib/business-understanding/__tests__/explain-next-question-for-ceo.test.ts',
  'features/workflow-journey/lib/business-understanding/__tests__/gap-ceo-surface-label.test.ts',
  'lib/project/__tests__/semantic-parity-lengths.test.ts',
].join(' ');

execSync(`pnpm exec vitest run ${vitestFiles}`, { cwd: webRoot, stdio: 'inherit' });

const commit = execSync('git rev-parse HEAD', { cwd: webRoot, encoding: 'utf8' }).trim();
process.env.EXPECT_COMMIT = commit;
execSync('node scripts/production-long-sprint-e2e.mjs', {
  cwd: webRoot,
  stdio: 'inherit',
  env: { ...process.env, EXPECT_COMMIT: commit },
});
