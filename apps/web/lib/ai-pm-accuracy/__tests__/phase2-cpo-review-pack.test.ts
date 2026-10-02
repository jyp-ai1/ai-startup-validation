import fs from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  buildPhase2CpoReviewPack,
  renderPhase2CpoReviewSheet,
  type Phase2SessionTraceInput,
} from '../phase2-cpo-review-pack';

const evidenceRoot = path.resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1',
);

function loadTraceFromEnv(): Phase2SessionTraceInput {
  const tracePath =
    process.env.PHASE2_TRACE_PATH ??
    path.join(evidenceRoot, 'PRODUCTION/real-business-review-trace.json');
  const raw = JSON.parse(fs.readFileSync(tracePath, 'utf8')) as Phase2SessionTraceInput;
  return raw;
}

afterAll(() => {
  if (process.env.PHASE2_CPO_PACK !== '1') return;
  const trace = loadTraceFromEnv();
  const pack = buildPhase2CpoReviewPack(trace);
  fs.mkdirSync(path.join(evidenceRoot, 'EVAL'), { recursive: true });
  fs.writeFileSync(
    path.join(evidenceRoot, 'EVAL/phase2-cpo-review-pack.json'),
    `${JSON.stringify(pack, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(evidenceRoot, 'CPO-PHASE2-REVIEW-SHEET.md'),
    `${renderPhase2CpoReviewSheet(pack, trace)}\n`,
  );
});

describe('Phase 2 CPO review pack', () => {
  it('builds rows from trace turns', () => {
    const trace: Phase2SessionTraceInput = {
      status: 'CAPTURED',
      sessionId: 'proj-1',
      productionUrl: 'https://example.com',
      gitSha: 'abc',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:10:00Z',
      turns: [
        {
          turn: 1,
          userAnswer: 'hello',
          askedGapId: 'customerPersona',
          askedQuestionText: 'Who?',
          answerUnderstanding: {
            extractedFacts: [],
            intent: null,
            quality: null,
            contradictions: [],
          },
          knowledgeStateDelta: { gapVerdicts: {}, understandingDelta: null },
          gapSnapshot: {},
          nextQuestion: {
            text: null,
            targetGap: null,
            action: null,
            rationale: null,
            causality: null,
          },
          layers: {
            L1: 'CAPTURED',
            L2: 'MISSING',
            L3: 'MISSING',
            L4: 'NOT_IN_PHASE2_INITIAL',
            L5: 'NOT_IN_PHASE2_INITIAL',
          },
          cpoVerdict: 'PENDING_CPO_2PASS',
        },
      ],
    };
    const pack = buildPhase2CpoReviewPack(trace);
    expect(pack.turnCount).toBe(1);
    expect(pack.phase2Status).toBe('AWAITING_CPO');
    const md = renderPhase2CpoReviewSheet(pack, trace);
    expect(md).toContain('Turn 1');
  });

  it('renders blocked sheet when no turns', () => {
    const trace: Phase2SessionTraceInput = {
      status: 'BLOCKED',
      sessionId: null,
      productionUrl: 'https://example.com',
      gitSha: null,
      startedAt: null,
      finishedAt: null,
      turns: [],
      blockReason: 'no auth',
    };
    const pack = buildPhase2CpoReviewPack(trace);
    const md = renderPhase2CpoReviewSheet(pack, trace);
    expect(md).toContain('Blocked');
  });
});
