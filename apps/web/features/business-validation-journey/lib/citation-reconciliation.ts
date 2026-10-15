import {
  applyCrossReview,
  assessCrossReview,
  type AnalysisPacket,
  type AnalysisStatus,
  type CrossReviewRecord,
} from './cross-review-contract';
import { readSource } from './founder-source';
import type { JourneyState } from './journey-types';

export type StoredSource = {
  id: string;
  text: string | null;
};

export type SourceCheckStatus = 'matched' | 'mismatched' | 'uncheckable';

export type ClaimBearingStatus = 'grounded' | 'ungrounded' | 'unassessed';

export type CitationCheck = {
  side: 'gemini' | 'gpt';
  executionId: string;
  analysisStatus: AnalysisStatus | 'absent';
  citedExcerpt: string | null;
  capturedSourceId: string | null;
  sourceCheck: SourceCheckStatus;
  claimBearing: ClaimBearingStatus;
  hypothesisIds: string[];
  verifiedFact: false;
  reason: string;
};

export type CitationTrace = {
  review: CrossReviewRecord;
  citations: CitationCheck[];
  verifiedFact: false;
  businessJudgment: 'preserved';
  reason: string;
};

const OUTSIDE_TOPIC = /지불|결제|비용을\s*내|비용|구매|반복|확장/;

export function storedSourcesFromJourney(state: JourneyState): StoredSource[] {
  return (state.sourceRecords ?? []).map((record) => ({
    id: record.id,
    text: record.text.trim() ? record.text : null,
  }));
}

export function reconcileCitations(
  gemini: AnalysisPacket | null,
  gpt: AnalysisPacket | null,
  sources: StoredSource[],
): CitationTrace {
  const review = assessCrossReview(gemini, gpt);
  const citations = [checkSide('gemini', gemini, sources), checkSide('gpt', gpt, sources)];
  return {
    review,
    citations,
    verifiedFact: false,
    businessJudgment: 'preserved',
    reason: traceReason(citations),
  };
}

export function applyCitationTrace(
  state: JourneyState,
  gemini: AnalysisPacket | null,
  gpt: AnalysisPacket | null,
  sources?: StoredSource[],
): { state: JourneyState; trace: CitationTrace } {
  const applied = applyCrossReview(state, gemini, gpt);
  return {
    state: applied.state,
    trace: reconcileCitations(gemini, gpt, sources ?? storedSourcesFromJourney(state)),
  };
}

export function liveCitationTrace(): CitationTrace {
  return reconcileCitations(null, null, []);
}

export function sourceCheckLabel(status: SourceCheckStatus): string {
  if (status === 'matched') return '원문 일치';
  if (status === 'mismatched') return '원문 불일치';
  return '대조 불가';
}

function checkSide(
  side: 'gemini' | 'gpt',
  packet: AnalysisPacket | null,
  sources: StoredSource[],
): CitationCheck {
  if (!packet) {
    return citation(side, packet, 'uncheckable', 'unassessed', '분석 결과가 없다. 실패와 구분한다. 출처 확인으로 세지 않는다.');
  }
  if (packet.status === 'result_missing') {
    return citation(
      side,
      packet,
      'uncheckable',
      'unassessed',
      '실행은 끝났으나 결과 본문이 없다. 실패, 미실행과 구분한다. 검증된 사실로 올리지 않는다.',
    );
  }
  if (packet.status === 'failed') {
    return citation(
      side,
      packet,
      'uncheckable',
      'unassessed',
      '분석이 실패했다. 결과가 없는 상태와 구분한다. 발췌가 있어도 출처 확인으로 세지 않는다.',
    );
  }
  if (packet.status !== 'succeeded') {
    return citation(
      side,
      packet,
      'uncheckable',
      'unassessed',
      '분석을 실행하지 않았다. 실패와 구분한다. 발췌가 있어도 출처 확인으로 세지 않는다.',
    );
  }
  if (!packet.capturedSourceId) {
    return citation(side, packet, 'uncheckable', 'unassessed', '원문 ID가 없다. 발췌만으로는 출처를 확인하지 않는다.');
  }
  const stored = sources.find((item) => item.id === packet.capturedSourceId);
  if (!stored) {
    return citation(
      side,
      packet,
      'uncheckable',
      'unassessed',
      '원문 ID는 있으나 저장된 원문을 찾지 못했다. 출처 확인 완료로 보지 않는다.',
    );
  }
  if (stored.text === null || !stored.text.trim()) {
    return citation(
      side,
      packet,
      'uncheckable',
      'unassessed',
      '원문 ID는 있으나 원문 내용에 접근할 수 없다. 출처 확인 완료로 보지 않는다.',
    );
  }
  const excerpt = packet.citedExcerpt?.trim() ?? '';
  if (!excerpt || !contains(stored.text, excerpt)) {
    return citation(
      side,
      packet,
      'mismatched',
      'unassessed',
      '발췌가 확보한 원문에 없다. 출처 확인 완료로 보지 않는다. 주장을 반대 사실로 바꾸지 않는다.',
    );
  }
  const bearing = bearClaim(packet.claim, packet.support, excerpt);
  return citation(side, packet, 'matched', bearing.status, bearing.reason);
}

function bearClaim(
  claim: string | null,
  support: string | null,
  excerpt: string,
): { status: ClaimBearingStatus; reason: string } {
  if (!claim?.trim()) {
    return { status: 'unassessed', reason: '발췌는 원문과 일치한다. 주장이 비어 평가하지 않는다. 검증된 사실은 아니다.' };
  }
  if (outsideTopic(claim, excerpt)) {
    return {
      status: 'ungrounded',
      reason: '발췌는 확보한 원문과 일치한다. 그 문장이 이 주장을 뒷받침하지 않는다. 사실이나 사업성을 입증하지 않는다.',
    };
  }
  const claimReading = readSource(claim);
  const excerptReading = readSource(excerpt);
  const tied = contains(support ?? '', excerpt) || contains(claim, excerpt);
  const sameReading = claimReading !== 'none' && claimReading === excerptReading;
  const quotesExcerpt = contains(claim, excerpt);
  if (tied && (sameReading || quotesExcerpt)) {
    return {
      status: 'grounded',
      reason: '발췌는 확보한 원문에 있다. 주장은 그 발췌 안에 머문다. 검증된 사실은 아니다.',
    };
  }
  return {
    status: 'ungrounded',
    reason: '발췌는 확보한 원문과 일치한다. 그 문장이 이 주장을 뒷받침하지 않는다. 사실이나 사업성을 입증하지 않는다.',
  };
}

function outsideTopic(claim: string, excerpt: string): boolean {
  return OUTSIDE_TOPIC.test(claim) && !OUTSIDE_TOPIC.test(excerpt);
}

function contains(haystack: string, needle: string): boolean {
  const normalized = needle.replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  return haystack.replace(/\s+/g, ' ').includes(normalized);
}

function citation(
  side: 'gemini' | 'gpt',
  packet: AnalysisPacket | null,
  sourceCheck: SourceCheckStatus,
  claimBearing: ClaimBearingStatus,
  reason: string,
): CitationCheck {
  return {
    side,
    executionId: packet?.executionId ?? `${side}-absent`,
    analysisStatus: packet?.status ?? 'absent',
    citedExcerpt: packet?.citedExcerpt ?? null,
    capturedSourceId: packet?.capturedSourceId ?? null,
    sourceCheck,
    claimBearing,
    hypothesisIds: packet?.hypothesisIds ?? [],
    verifiedFact: false,
    reason,
  };
}

function traceReason(citations: CitationCheck[]): string {
  const statuses = citations.map((item) => item.analysisStatus);
  if (statuses.every((status) => status === 'absent' || status === 'not_run')) {
    return '분석 결과가 없다. 모델 발췌와 확보 원문을 대조 완료로 보지 않는다.';
  }
  if (statuses.some((status) => status !== 'succeeded')) {
    return '분석이 실행되지 않았거나 실패했다. 모델 발췌와 확보 원문을 대조 완료로 보지 않는다.';
  }
  if (citations.every((item) => item.sourceCheck === 'matched')) {
    return '발췌 일치는 출처 확인이다. 사실 검증과 사업 판단은 바꾸지 않는다.';
  }
  return '출처 대조를 완료로 표시하지 않는다. 사업 판단은 유보로 남는다.';
}
