import { getResearchProvider } from '@/features/agents/research/providers';

import type { JourneyState } from './journey-types';

export const GEMINI_RESEARCH_PATH = {
  stageId: 'gemini-research',
  providerId: 'openrouter',
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  modelId: 'google/gemini-2.5-flash',
  caller: 'apps/web/features/agents/research/providers/openrouter-provider.ts',
} as const;

export const GPT_COUNTER_PATH = {
  stageId: 'gpt-counter-review',
  providerId: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  modelId: 'gpt-4o-mini',
  caller: 'packages/ai/src/providers/openai-http.ts',
} as const;

export type ModelReading = {
  side: 'gemini' | 'gpt';
  executed: boolean;
  modelId: string | null;
  endpoint: string | null;
  text: string | null;
  captureId: string | null;
};

export type ComparisonOutcome = 'not_compared' | 'agreement' | 'disagreement' | 'insufficient_evidence';

export type ReadingComparison = {
  outcome: ComparisonOutcome;
  verifiedFact: false;
  judgmentChange: 'preserved';
  reason: string;
};

export type LoopStageStatus = 'connected_local' | 'not_called' | 'blocked_same_provider' | 'not_connected';

export type LoopStage = {
  id: string;
  status: LoopStageStatus;
  detail: string;
};

export type LoopTrace = {
  stages: LoopStage[];
  researchStatus: JourneyState['researchStatus'];
  counterReviewStatus: JourneyState['counterReviewStatus'];
  judgmentStatus: JourneyState['judgmentStatus'];
  judgmentText: string;
  redeliveryId: string | null;
  includedAnswerIds: string[];
  providerObjectsSeparated: boolean;
  liveModelCall: false;
  namedOpenAiProviderId: string;
};

export function compareReadings(gemini: ModelReading, gpt: ModelReading): ReadingComparison {
  const independent =
    gpt.executed &&
    gpt.modelId === GPT_COUNTER_PATH.modelId &&
    gpt.endpoint === GPT_COUNTER_PATH.endpoint &&
    gemini.executed &&
    gemini.modelId === GEMINI_RESEARCH_PATH.modelId &&
    gemini.endpoint === GEMINI_RESEARCH_PATH.endpoint;

  if (!independent || !gemini.executed) {
    return {
      outcome: 'not_compared',
      verifiedFact: false,
      judgmentChange: 'preserved',
      reason: '독립 GPT 호출이 없거나 Gemini와 같은 경로다. 반대 검토를 실행한 것으로 두지 않는다.',
    };
  }

  if (!gemini.captureId || !gpt.captureId || !gemini.text || !gpt.text) {
    return {
      outcome: 'insufficient_evidence',
      verifiedFact: false,
      judgmentChange: 'preserved',
      reason: '양쪽 문장이 있어도 캡처 ID가 없으면 근거가 부족하다. 판단을 바꾸지 않는다.',
    };
  }

  if (gemini.text.trim() === gpt.text.trim()) {
    return {
      outcome: 'agreement',
      verifiedFact: false,
      judgmentChange: 'preserved',
      reason: '두 문장이 같다. 모델이 같다는 사실과 그 내용이 검증됐다는 사실은 다르다. 판단을 바꾸지 않는다.',
    };
  }

  return {
    outcome: 'disagreement',
    verifiedFact: false,
    judgmentChange: 'preserved',
    reason: '두 문장이 다르다. 불일치는 기록만 하고, 어느 쪽도 검증된 사실로 올리지 않는다.',
  };
}

export function traceJudgmentLoop(state: JourneyState): LoopTrace {
  const gemini = getResearchProvider('gemini');
  const namedOpenAi = getResearchProvider('openai');
  const sameObject = gemini === namedOpenAi;

  return {
    stages: [
      {
        id: 'screen-input',
        status: 'connected_local',
        detail: '화면은 startJourney, applyAnswer, correctField만 호출한다.',
      },
      {
        id: 'context',
        status: state.redelivery ? 'connected_local' : 'not_called',
        detail: state.redelivery
          ? `재전달 ${state.redelivery.id}. inputReady ${state.redelivery.inputReady}. sent ${state.redelivery.sent}.`
          : '재전달 기록이 없다.',
      },
      {
        id: GEMINI_RESEARCH_PATH.stageId,
        status: 'not_called',
        detail: `여정 화면은 ${GEMINI_RESEARCH_PATH.caller}를 호출하지 않는다. 모델 ${GEMINI_RESEARCH_PATH.modelId}.`,
      },
      {
        id: GPT_COUNTER_PATH.stageId,
        status: sameObject ? 'blocked_same_provider' : 'not_connected',
        detail: sameObject
          ? `getResearchProvider('openai')는 id ${namedOpenAi.id}인 Gemini 객체다. ${GPT_COUNTER_PATH.endpoint}로 가지 않는다.`
          : '이름만 분리되어 있어도 이 화면은 호출하지 않는다.',
      },
      {
        id: 'compare',
        status: 'not_connected',
        detail: '화면은 두 모델의 문장을 취합하지 않는다. 취합 함수는 호출 결과가 있을 때만 테스트에서 쓴다.',
      },
      {
        id: 'judgment',
        status: 'not_connected',
        detail: '화면은 applyEvidenceTransition을 호출하지 않는다. 판단 문장은 유보로 남는다.',
      },
      {
        id: 'next-step',
        status: 'connected_local',
        detail: '다음 질문 또는 검증 행동은 로컬 상태에서 고른다. 모델 결과를 받지 않는다.',
      },
    ],
    researchStatus: state.researchStatus,
    counterReviewStatus: state.counterReviewStatus,
    judgmentStatus: state.judgmentStatus,
    judgmentText: state.judgmentText,
    redeliveryId: state.redelivery?.id ?? null,
    includedAnswerIds: state.redelivery?.includedAnswerIds ?? [],
    providerObjectsSeparated: !sameObject,
    liveModelCall: false,
    namedOpenAiProviderId: namedOpenAi.id,
  };
}
