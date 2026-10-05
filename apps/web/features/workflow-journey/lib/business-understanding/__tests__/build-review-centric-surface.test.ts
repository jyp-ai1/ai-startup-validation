import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { AnswerReview, ConversationFactKey } from '@repo/types/domain/answer-review';

import { CLINICFLOW_DOCUMENT } from '@/lib/demo/demo-seed-documents';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import { emptyConversationMemory, upsertConfirmedFact } from '../conversation-memory';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  REVIEW_SLOT_PENDING,
  REVIEW_SLOT_SEEN_UNVERIFIED,
  buildReviewCentricSurface,
  isSourceReprint,
} from '../build-review-centric-surface';
import {
  createEmptyGapState,
  getClosedGapIds,
  updateGapStateFromReview,
} from '../update-gap-state-from-review';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const BREWERY_PROD =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';

const JUINJIP1 = readFileSync(
  resolve(__dirname, '../../../../../e2e/fixtures/p0-11-brewery-plan.txt'),
  'utf8',
);

const BANCHAN = readFileSync(
  resolve(__dirname, '../../../../../e2e/fixtures/p0-11-banchan-plan.txt'),
  'utf8',
);

const AI_PM_SAAS = [
  '10~50인 스타트업 CEO와 PM이 전략 검토를 회의마다 처음부터 다시 하는 문제입니다.',
  'CEO와 PM이 월 구독으로 사용합니다.',
  'Notion, Linear, Jira 같은 도구들이 있지만 AI PM 관점 전략 검토는 없습니다.',
  '전략 회의 맥락을 기억하고 다음 액션까지 연결하는 AI PM Copilot입니다.',
].join('\n');

const BUSINESSES: Array<{ id: string; document: string; firstAsk: string }> = [
  { id: 'brewery-prod', document: BREWERY_PROD, firstAsk: 'payer' },
  { id: 'juinjip1', document: JUINJIP1, firstAsk: 'payer' },
  { id: 'banchan', document: BANCHAN, firstAsk: 'alternativesCompetitors' },
  { id: 'ai-pm-saas', document: AI_PM_SAAS, firstAsk: 'payer' },
  { id: 'clinicflow', document: CLINICFLOW_DOCUMENT, firstAsk: 'payer' },
];

function livingFrom(document: string, turns: AiPmLoopTurn[] = [], memory = emptyConversationMemory('review-surface')) {
  return buildLivingUnderstandingState({
    documentText: document,
    understanding: buildBusinessUnderstanding(document),
    turns,
    memory,
  });
}

function closeGapReview(gapId: string, value: string, factKey: ConversationFactKey): AnswerReview {
  return {
    reviewId: `rev-${gapId}`,
    turnId: `t-${gapId}`,
    sourceTurnId: `t-${gapId}`,
    createdAt: '2026-10-05T00:00:00.000Z',
    askedGapId: gapId,
    askedQuestionText: 'q',
    askedIssueId: 'customer_definition',
    userAnswer: value,
    extractedFacts: [
      {
        key: factKey,
        value,
        evidenceClass: 'FACT',
        confidence: 'high',
        targetGap: gapId,
        source: 'explicit',
      },
    ],
    known: [gapId],
    unknown: [],
    unconfirmed: [],
    contradictions: [],
    gapVerdicts: {
      [gapId]: {
        gapId,
        completeness: 'CLOSED',
        rationale: 'founder confirmed',
        factKeys: [factKey],
      },
    },
    recommendedAction: 'advance',
    rationale: 'closed',
  };
}

function surfaceFor(
  document: string,
  options?: {
    targetGap?: string;
    gapState?: ReturnType<typeof createEmptyGapState>;
    turns?: AiPmLoopTurn[];
    memory?: ReturnType<typeof emptyConversationMemory>;
    question?: string;
  },
) {
  return buildReviewCentricSurface({
    living: livingFrom(document, options?.turns, options?.memory),
    gapState: options?.gapState ?? createEmptyGapState(),
    documentText: document,
    displayQuestionText: options?.question ?? '이 서비스를 가장 필요로 하는 사람은 누구인가요?',
    targetGap: options?.targetGap ?? 'customerPersona',
  });
}

describe('buildReviewCentricSurface — Journey C presentation only', () => {
  it('rejects source reprint as a structured slot', () => {
    expect(isSourceReprint(BREWERY_PROD, BREWERY_PROD)).toBe(true);
    expect(isSourceReprint('내국인·외국인 관광객', BREWERY_PROD)).toBe(false);

    const reprintLiving = livingFrom(BREWERY_PROD);
    reprintLiving.spine.business = BREWERY_PROD;
    reprintLiving.claims = reprintLiving.claims.map((claim) =>
      claim.fieldKey === 'businessOneLiner' ? { ...claim, value: BREWERY_PROD } : claim,
    );

    const snapshot = buildReviewCentricSurface({
      living: reprintLiving,
      gapState: createEmptyGapState(),
      documentText: BREWERY_PROD,
      displayQuestionText: '이 사업은 누구에게 무엇을 제공하나요?',
      targetGap: 'businessOneLiner',
    });

    expect(snapshot.slots.find((slot) => slot.key === 'business')?.value).toBe(
      REVIEW_SLOT_SEEN_UNVERIFIED,
    );
    expect(snapshot.slots.some((slot) => slot.value === BREWERY_PROD)).toBe(false);
  });

  it.each(BUSINESSES)(
    '$id — Founder sees structure, judgment, uncertainty, and why this question',
    ({ document, firstAsk }) => {
      const snapshot = surfaceFor(document, { targetGap: firstAsk });

      expect(snapshot.slots.map((slot) => slot.key)).toEqual([
        'business',
        'customer',
        'payer',
        'problem',
      ]);
      for (const slot of snapshot.slots) {
        expect(isSourceReprint(slot.value, document)).toBe(false);
        expect(slot.value.length).toBeGreaterThan(0);
        expect(slot.value).not.toMatch(/customerPersona|businessOneLiner|problemJtbd/);
      }

      expect(snapshot.judgment.length).toBeGreaterThan(10);
      expect(snapshot.judgment).not.toMatch(/customerPersona|gapState|CLOSED/);
      expect(snapshot.uncertainty.length).toBeGreaterThan(4);
      expect(snapshot.whyThisQuestion).toMatch(/달라집니다/);
      expect(snapshot.progressLabel).toMatch(/지금까지 확인한 것 \d+개 · 아직 중요한 것 \d+개/);
      expect(snapshot.themes.some((theme) => theme.label === '사업성 판단')).toBe(true);
      expect(snapshot.questionText.length).toBeGreaterThan(4);
    },
  );

  it('brewery — founder customer write updates judgment from existing gapState', () => {
    const before = surfaceFor(BREWERY_PROD, { targetGap: 'customerPersona' });
    expect(before.judgment).toMatch(/아직|보이지만/);
    expect(before.themes.find((theme) => theme.id === 'customer')?.status).toBe('unverified');

    const memory = upsertConfirmedFact(
      emptyConversationMemory('review-surface'),
      'customer',
      '내국인·외국인 관광객',
      'user_turn',
    );
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '내국인·외국인 관광객',
        appliedAt: '2026-10-05T00:00:00.000Z',
      },
    ];
    const gapState = updateGapStateFromReview(
      closeGapReview('customerPersona', '내국인·외국인 관광객', 'customer'),
      createEmptyGapState(),
    );

    expect(getClosedGapIds(gapState)).toEqual(['customerPersona']);

    const after = surfaceFor(BREWERY_PROD, {
      targetGap: 'payer',
      gapState,
      turns,
      memory,
      question: '이 서비스 비용은 누가 지불하나요?',
    });

    expect(after.slots.find((slot) => slot.key === 'customer')?.value).toContain('내국인');
    expect(after.slots.find((slot) => slot.key === 'customer')?.value).not.toBe(REVIEW_SLOT_PENDING);
    expect(after.themes.find((theme) => theme.id === 'customer')?.status).toBe('confirmed');
    expect(after.judgment).not.toBe(before.judgment);
    expect(after.judgment).toMatch(/지불|대안/);
    expect(after.uncertainty).toMatch(/지불/);
    expect(after.whyThisQuestion).toMatch(/지불 주체/);
    expect(after.confirmedCount).toBeGreaterThan(before.confirmedCount);
  });

  it('does not invent persistent ReviewState — empty gapState stays empty after mapping', () => {
    const gapState = createEmptyGapState();
    surfaceFor(BANCHAN, { gapState, targetGap: 'payer' });
    expect(gapState).toEqual(createEmptyGapState());
    expect(getClosedGapIds(gapState)).toEqual([]);
  });
});
