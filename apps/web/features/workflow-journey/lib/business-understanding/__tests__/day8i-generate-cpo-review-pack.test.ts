/**
 * Generates DAY_8I_CPO_REVIEW_PACK.md for CPO conversation-paste review.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { runDay8iConversation } from '../day8i-conversation-harness';
import { formatDay8iCpoReviewPack } from '../day8i-cpo-review-pack';
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

export function generateDay8iCpoReviewPack(): string {
  stubSessionStorage();
  setV3ReviewPipelineForTest(true);
  setAiPmJudgmentAggregationV1ForTest(true);

  const projectId = `day8i-review-pack-${Date.now()}`;
  const result = runDay8iConversation({ projectId });
  clearAiPmLoopState(projectId);

  return formatDay8iCpoReviewPack(result, {
    commitSha: gitSha(),
    branch: gitBranch(),
    executedAt: new Date().toISOString(),
    command: 'node apps/web/scripts/generate-day8i-cpo-review-pack.mjs',
  });
}

describe('DAY 8-I — CPO Review Pack Generator', () => {
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

  it('writes CPO Review Pack to docs/evidence/ALABOM/', () => {
    const pack = generateDay8iCpoReviewPack();
    expect(pack).toContain('# ALABOM — DAY 8-I CPO REVIEW PACK');
    expect(pack).toContain('PART 1 — 30턴 전체 원문');
    expect(pack).toContain('Turn 01');
    expect(pack).toContain('Turn 30');
    expect(pack).toContain('CPO-R1');
    expect(pack).toContain('CPO-R12');

    const outDir = path.resolve(__dirname, '../../../../../../../docs/evidence/ALABOM');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'DAY_8I_CPO_REVIEW_PACK.md');
    fs.writeFileSync(outPath, pack, 'utf8');
    console.info(`[day8i] CPO Review Pack: ${outPath} (${pack.length} chars)`);
    expect(fs.existsSync(outPath)).toBe(true);
  }, 120_000);
});
