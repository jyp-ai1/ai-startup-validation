import { isProviderConfigured } from '@repo/ai';

import type { ResearchProvider, ResearchRequest, ResearchResultPayload, ResearchTaskType } from '../services/research-agent-types';

export const GPT_COUNTER_REVIEW = {
  id: 'openai' as const,
  endpoint: 'https://api.openai.com/v1/chat/completions',
  modelId: 'gpt-4o-mini',
};

export type CounterReviewGate = {
  providerId: 'openai';
  modelId: 'gpt-4o-mini';
  endpoint: 'https://api.openai.com/v1/chat/completions';
  status: 'counter_review_not_run';
  execution: 'key_missing' | 'call_not_opened';
  networkCalled: false;
  reason: string;
};

export function gateCounterReview(keyPresent = isProviderConfigured('openai')): CounterReviewGate {
  if (!keyPresent) {
    return gate('key_missing', 'OPENAI_API_KEY가 없다. 네트워크 호출을 하지 않는다.');
  }
  return gate('call_not_opened', '이 단계에서는 GPT 호출을 열지 않는다. 분석 완료로 두지 않는다.');
}

function gate(execution: CounterReviewGate['execution'], reason: string): CounterReviewGate {
  return {
    providerId: 'openai',
    modelId: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    status: 'counter_review_not_run',
    execution,
    networkCalled: false,
    reason,
  };
}

export class OpenAICounterReviewProvider implements ResearchProvider {
  readonly id = 'openai' as const;
  readonly endpoint = GPT_COUNTER_REVIEW.endpoint;
  readonly modelId = GPT_COUNTER_REVIEW.modelId;

  execute(request: ResearchRequest, tasks: ResearchTaskType[]): Promise<ResearchResultPayload> {
    const gate = gateCounterReview();
    const blocked = `${gate.reason} project ${request.projectId} tasks ${tasks.length}`;
    return Promise.reject(new Error(blocked));
  }
}
