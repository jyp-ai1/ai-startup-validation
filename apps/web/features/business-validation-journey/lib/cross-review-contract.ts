import type { JourneyState } from './journey-types';

export const CROSS_REVIEW_MODELS = {
  gemini: {
    providerId: 'openrouter' as const,
    modelId: 'google/gemini-2.5-flash',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    purpose: 'research' as const,
  },
  gpt: {
    providerId: 'openai' as const,
    modelId: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    purpose: 'counter_review' as const,
  },
};

export type AnalysisStatus = 'succeeded' | 'failed' | 'not_run';

export type AnalysisPacket = {
  executionId: string;
  providerId: string;
  modelId: string;
  endpoint: string;
  purpose: 'research' | 'counter_review';
  status: AnalysisStatus;
  answerIds: string[];
  evidenceIds: string[];
  claim: string | null;
  support: string | null;
  counter: string | null;
  uncertainty: string | null;
  hypothesisIds: string[];
  citedExcerpt: string | null;
  capturedSourceId: string | null;
};

export type CrossReviewOutcome = 'agreement' | 'disagreement' | 'insufficient_evidence' | 'not_compared';

export type PreservedClaim = {
  side: 'gemini' | 'gpt';
  executionId: string;
  claim: string;
  support: string | null;
  counter: string | null;
  hypothesisIds: string[];
  citedExcerpt: string | null;
  capturedSourceId: string | null;
};

export type CrossReviewRecord = {
  outcome: CrossReviewOutcome;
  verifiedFact: false;
  businessJudgment: 'preserved';
  preservedClaims: PreservedClaim[];
  affectedHypothesisIds: string[];
  nextEvidence: string | null;
  reason: string;
};

export function assessCrossReview(
  gemini: AnalysisPacket | null,
  gpt: AnalysisPacket | null,
): CrossReviewRecord {
  if (!isRunnable(gemini, 'gemini') || !isRunnable(gpt, 'gpt')) {
    return record('not_compared', gemini, gpt, [], null, '한쪽이라도 실제 분석 결과가 없다. 비교하지 않고 직전 판단을 유지한다.');
  }
  if (!hasAnchor(gemini) || !hasAnchor(gpt) || !gemini.claim || !gpt.claim) {
    return record(
      'insufficient_evidence',
      gemini,
      gpt,
      claimsOf(gemini, gpt),
      '판단에 쓸 원문 발췌나 확보한 원문 ID가 없다.',
      '출처가 없거나 주장이 비어 있다. 검증된 사실로 올리지 않고 이전 판단을 유지한다.',
    );
  }
  if (gemini.claim.trim() === gpt.claim.trim()) {
    const captured = Boolean(gemini.capturedSourceId && gpt.capturedSourceId);
    return record(
      'agreement',
      gemini,
      gpt,
      claimsOf(gemini, gpt),
      null,
      captured
        ? '두 결론이 같다. 일치와 사실 검증은 별개다. 가설을 검증 완료로 바꾸지 않는다.'
        : '두 결론이 같다. 모델이 말한 출처와 확보한 원문은 다르다. 사실로 올리지 않는다.',
    );
  }
  return record(
    'disagreement',
    gemini,
    gpt,
    claimsOf(gemini, gpt),
    '두 해석을 가릴 확보된 원문 한 건이 더 필요하다. 모델 문장만으로 한쪽을 고르지 않는다.',
    '결론이 다르다. 양쪽 주장과 근거를 남긴다. 어느 쪽도 검증된 사실이 아니다.',
  );
}

export function applyCrossReview(
  state: JourneyState,
  gemini: AnalysisPacket | null,
  gpt: AnalysisPacket | null,
): { state: JourneyState; review: CrossReviewRecord } {
  const review = assessCrossReview(gemini, gpt);
  const failed = gemini?.status === 'failed' || gpt?.status === 'failed';
  if (failed || review.outcome === 'not_compared') {
    return { state, review };
  }
  return {
    state: {
      ...state,
      judgmentText: state.judgmentText,
      judgmentStatus: 'judgment_deferred',
      hypothesisJudgments: state.hypothesisJudgments,
      sourceRecords: state.sourceRecords,
      researchStatus: 'research_not_run',
      counterReviewStatus: 'counter_review_not_run',
    },
    review,
  };
}

export function liveCrossReview(): CrossReviewRecord {
  return assessCrossReview(idlePacket('gemini'), idlePacket('gpt'));
}

function idlePacket(side: 'gemini' | 'gpt'): AnalysisPacket {
  const model = CROSS_REVIEW_MODELS[side];
  return {
    executionId: `${side}-not-run`,
    providerId: model.providerId,
    modelId: model.modelId,
    endpoint: model.endpoint,
    purpose: model.purpose,
    status: 'not_run',
    answerIds: [],
    evidenceIds: [],
    claim: null,
    support: null,
    counter: null,
    uncertainty: null,
    hypothesisIds: [],
    citedExcerpt: null,
    capturedSourceId: null,
  };
}

function isRunnable(packet: AnalysisPacket | null, side: 'gemini' | 'gpt'): packet is AnalysisPacket {
  if (!packet || packet.status !== 'succeeded') return false;
  const model = CROSS_REVIEW_MODELS[side];
  return (
    packet.providerId === model.providerId &&
    packet.modelId === model.modelId &&
    packet.endpoint === model.endpoint &&
    packet.purpose === model.purpose
  );
}

function hasAnchor(packet: AnalysisPacket): boolean {
  return Boolean(packet.capturedSourceId || packet.citedExcerpt?.trim());
}

function claimsOf(gemini: AnalysisPacket, gpt: AnalysisPacket): PreservedClaim[] {
  return [claimFrom('gemini', gemini), claimFrom('gpt', gpt)].filter((item): item is PreservedClaim => item !== null);
}

function claimFrom(side: 'gemini' | 'gpt', packet: AnalysisPacket): PreservedClaim | null {
  if (!packet.claim) return null;
  return {
    side,
    executionId: packet.executionId,
    claim: packet.claim,
    support: packet.support,
    counter: packet.counter,
    hypothesisIds: packet.hypothesisIds,
    citedExcerpt: packet.citedExcerpt,
    capturedSourceId: packet.capturedSourceId,
  };
}

function record(
  outcome: CrossReviewOutcome,
  gemini: AnalysisPacket | null,
  gpt: AnalysisPacket | null,
  preservedClaims: PreservedClaim[],
  nextEvidence: string | null,
  reason: string,
): CrossReviewRecord {
  const ids = new Set<string>();
  for (const packet of [gemini, gpt]) {
    if (packet?.status === 'succeeded') {
      for (const id of packet.hypothesisIds) ids.add(id);
    }
  }
  return {
    outcome,
    verifiedFact: false,
    businessJudgment: 'preserved',
    preservedClaims,
    affectedHypothesisIds: [...ids],
    nextEvidence,
    reason,
  };
}
