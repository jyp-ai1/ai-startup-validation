import { acceptAnalysisResults, liveScreenStatus } from './analysis-acceptance';
import type { StoredSource } from './citation-reconciliation';
import {
  CROSS_REVIEW_MODELS,
  type AnalysisPacket,
  type ExecutionInputSnapshot,
} from './cross-review-contract';
import type { JourneyState } from './journey-types';

export type AnalysisExecutionRequest = {
  executionId: string;
  providerId: string;
  modelId: string;
  endpoint: string;
  purpose: 'research' | 'counter_review';
  status: 'succeeded' | 'failed' | 'not_run';
  inputSnapshot: ExecutionInputSnapshot;
  claim: string | null;
  support: string | null;
  counter: string | null;
  uncertainty: string | null;
  citedExcerpt: string | null;
  capturedSourceId: string | null;
};

export const EXECUTION_BOUNDARY = {
  sameExecution: '같은 실행 ID의 재전달은 새 분석으로 세지 않고 첫 기록의 주장과 입력 스냅샷을 유지한다.',
  newExecution: '재시도는 새 실행 ID다. 실패한 실행 기록은 남긴다.',
  resultMissing: '성공이라고 표시됐어도 주장 본문이 없으면 result_missing이다.',
  notCompared: 'not_compared는 두 결론이 일치한다는 뜻이 아니다. 비교할 실제 분석 결과가 없다는 뜻이다.',
  supported: 'supported는 현재 원문이 그 가설을 지지하는 상태다. 사업성 검증이 아니다.',
  verifiedFact: '모델 합의, 출처 일치, grounded는 verifiedFact를 true로 만들지 않는다.',
} as const;

export function canonicalExecution(
  side: 'gemini' | 'gpt',
  input: Omit<AnalysisExecutionRequest, 'providerId' | 'modelId' | 'endpoint' | 'purpose'> &
    Partial<Pick<AnalysisExecutionRequest, 'providerId' | 'modelId' | 'endpoint' | 'purpose'>>,
): AnalysisExecutionRequest {
  const model = CROSS_REVIEW_MODELS[side];
  return {
    providerId: model.providerId,
    modelId: model.modelId,
    endpoint: model.endpoint,
    purpose: model.purpose,
    ...input,
  };
}

export function toAnalysisPacket(request: AnalysisExecutionRequest): AnalysisPacket {
  const missingResult = request.status === 'succeeded' && !request.claim?.trim();
  return {
    executionId: request.executionId,
    providerId: request.providerId,
    modelId: request.modelId,
    endpoint: request.endpoint,
    purpose: request.purpose,
    status: missingResult ? 'result_missing' : request.status,
    answerIds: request.inputSnapshot.answerIds,
    evidenceIds: request.inputSnapshot.evidenceIds,
    hypothesisIds: request.inputSnapshot.hypothesisIds,
    claim: request.claim,
    support: request.support,
    counter: request.counter,
    uncertainty: request.uncertainty,
    citedExcerpt: request.citedExcerpt,
    capturedSourceId: request.capturedSourceId,
    inputSnapshot: request.inputSnapshot,
  };
}

export function admitExecutions(
  state: JourneyState,
  input: {
    now: string;
    gemini?: AnalysisExecutionRequest | null;
    gpt?: AnalysisExecutionRequest | null;
    sources?: StoredSource[];
  },
) {
  return acceptAnalysisResults(
    state,
    input.gemini ? toAnalysisPacket(input.gemini) : null,
    input.gpt ? toAnalysisPacket(input.gpt) : null,
    { now: input.now, sources: input.sources },
  );
}

export function screenStateContract(state: JourneyState) {
  const live = liveScreenStatus(state);
  const recorded = (state.analysisAcceptances ?? []).some((record) => record.disposition === 'recorded');
  return {
    research: live.researchStatus,
    counterReview: live.counterReviewStatus,
    acceptance: recorded ? ('acceptance_recorded' as const) : ('acceptance_absent' as const),
    citation: 'source_uncheckable' as const,
    judgment: live.judgmentStatus,
    comparison: 'not_compared' as const,
    analysisCompleted: false as const,
  };
}
