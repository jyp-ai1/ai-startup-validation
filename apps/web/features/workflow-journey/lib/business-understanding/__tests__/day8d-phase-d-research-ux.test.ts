import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { classifyAiPmCeoIntent, researchIntentStubMessage } from '../ai-pm-intent-policy';
import {
  buildResearchAcknowledgement,
  detectResearchTopic,
  sanitizeResearchCopyForCeo,
} from '../ai-pm-research-ux-policy';
import { setAiPmResearchUxV1ForTest } from '../ai-pm-research-ux-policy-v1';
import { applyNoAskPolicy } from '../ai-pm-no-ask-policy';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { createEmptyGapState } from '../update-gap-state-from-review';
import { evaluateStageReadiness } from '../evaluate-stage-readiness';
import { resolveGapQuestionBinding } from '../gap-question-map';
import type { NextQuestionDecision } from '../decide-next-question-from-review';

const DOC = `# SaaS

서비스: B2B SaaS`;

describe('DAY 8-D Phase D — Research UX', () => {
  beforeEach(() => {
    setAiPmResearchUxV1ForTest(true);
    setAiPmNoAskPolicyV1ForTest(false);
    setV3ReviewPipelineForTest(true);
  });

  afterEach(() => {
    setAiPmResearchUxV1ForTest(null);
    setAiPmNoAskPolicyV1ForTest(null);
    setV3ReviewPipelineForTest(null);
  });

  it('D1 — competitor research intent', () => {
    expect(classifyAiPmCeoIntent('경쟁사 찾아줘').intent).toBe('RESEARCH');
    expect(classifyAiPmCeoIntent('시장조사 해줘').intent).toBe('RESEARCH');
    expect(classifyAiPmCeoIntent('비슷한 서비스 조사해줘').intent).toBe('RESEARCH');
  });

  it('D1b — embedded factual answer stays ANSWER', () => {
    expect(classifyAiPmCeoIntent('배민이요 경쟁사 찾아줘').intent).toBe('ANSWER');
  });

  it('D3 — acknowledgement has no internal meta', () => {
    const ack = buildResearchAcknowledgement('경쟁사 찾아줘');
    expect(ack.headline).toMatch(/경쟁|대안/);
    expect(ack.headline).not.toMatch(/RESEARCH|intent|gapId|policy/i);
    expect(sanitizeResearchCopyForCeo('RESEARCH intent=foo')).not.toMatch(/RESEARCH/);
  });

  it('D3b — researchIntentStubMessage uses Phase D copy when flag ON', () => {
    const msg = researchIntentStubMessage('경쟁사 찾아줘');
    expect(msg).toMatch(/경쟁|대안|확인/);
    expect(msg).not.toMatch(/준비 중/);
  });

  it('D2 — resolveNextQuestionDecision frozen when researchPending', () => {
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: buildBusinessUnderstanding(DOC),
    });
    const lastDecision: NextQuestionDecision = {
      targetGap: 'customerPersona',
      targetGapId: 'customerPersona',
      issueId: 'customer_definition',
      questionText: resolveGapQuestionBinding('customerPersona').questionText,
      whyNow: 'test',
      rationale: 'test',
      score: 1000,
      reframed: false,
      excludedGaps: [],
      drivenByReview: true,
      sourceAnswerId: 'bootstrap',
      sourceReviewId: 'bootstrap',
      reviewAction: 'advance',
      action: 'advance',
      actionRationale: 'test',
      reason: 'test',
    };

    const decision = resolveNextQuestionDecision({
      living,
      turns: [],
      memory: null,
      gapState: createEmptyGapState(),
      researchPending: true,
    });

    expect(decision).toBeNull();
  });

  it('D5 — topic detection', () => {
    expect(detectResearchTopic('경쟁사 찾아줘')).toBe('competitor');
    expect(detectResearchTopic('시장조사 해줘')).toBe('market');
    expect(detectResearchTopic('알아봐 줘')).toBe('general');
  });
});
