/**
 * Generates DAY 8-I CPO Evidence Report (run via vitest or tsx).
 * node apps/web/scripts/generate-day8i-cpo-evidence.mjs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { runDay8iConversation } from '../day8i-conversation-harness';
import {
  formatDay8iCpoEvidenceReport,
  type Day8iCpoEvidenceMeta,
} from '../day8i-cpo-evidence-report';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage });
}

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function gitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export function generateDay8iCpoEvidenceReport(): string {
  stubSessionStorage();
  setV3ReviewPipelineForTest(true);
  setAiPmJudgmentAggregationV1ForTest(true);

  const projectId = `day8i-cpo-evidence-${Date.now()}`;
  const result = runDay8iConversation({ projectId });
  clearAiPmLoopState(projectId);

  const executedAt = new Date().toISOString();
  const selfFail = result.cpoSelfChecks.filter((c) => c.verdict === 'FAIL').length;
  const meta: Day8iCpoEvidenceMeta = {
    commitSha: gitSha(),
    branch: gitBranch(),
    executedAt,
    command: 'node apps/web/scripts/generate-day8i-cpo-evidence.mjs',
    environment: 'local vitest harness (CI/cloud agent)',
    v3ReviewPipeline: true,
    judgmentAggregation: true,
    testResult: selfFail === 0 && result.totalTurns === 30 ? 'PASS' : 'FAIL',
    nodeVersion: process.version,
  };

  return formatDay8iCpoEvidenceReport(result, meta);
}

describe('DAY 8-I — CPO Evidence Report Generator', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('generates full CPO evidence report to docs/evidence/ALABOM/', () => {
    const report = generateDay8iCpoEvidenceReport();
    expect(report).toContain('# ALABOM — DAY 8-I CPO Review Evidence Report');
    expect(report).toContain('Turn 01');
    expect(report).toContain('Turn 30');
    expect(report).toContain('## 9. CTO 자기검증 (CPO-R1~R12)');
    expect(report).toContain('CPO Review Evidence (mandatory section)');

    const outDir = path.resolve(__dirname, '../../../../../../../docs/evidence/ALABOM');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'DAY_8I_CPO_EVIDENCE_REPORT.md');
    fs.writeFileSync(outPath, report, 'utf8');

    const legacyPath = path.join(outDir, 'DAY_8I_CTO_30_TURN_REPORT.md');
    fs.writeFileSync(
      legacyPath,
      report,
      'utf8',
    );

    expect(fs.existsSync(outPath)).toBe(true);
    console.info(`[day8i] CPO Evidence Report: ${outPath}`);
  }, 120_000);
});
