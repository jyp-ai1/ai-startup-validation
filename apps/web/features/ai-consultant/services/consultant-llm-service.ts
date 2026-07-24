import 'server-only';

import { chatService, chatWithFallback, promptBuilder, resolveDefaultModel, tokenManager } from '@repo/ai';

export type ConsultantChatInput = {
  question: string;
  projectTitle: string;
  memory?: string[];
  locale?: string;
  promptVersion?: string;
};

export type ConsultantChatResult = {
  answer: string;
  model: string;
  provider: string;
  latencyMs: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  estimatedCostUsd: number;
};

export async function generateConsultantAnswer(
  input: ConsultantChatInput,
): Promise<ConsultantChatResult> {
  const messages = promptBuilder.buildMessages(
    {
      projectTitle: input.projectTitle,
      question: input.question,
      memory: input.memory?.join(', '),
      locale: input.locale ?? 'ko',
    },
    'consultant',
    input.promptVersion ?? 'v1',
  );

  const model = resolveDefaultModel('openrouter');
  const response = await chatWithFallback(
    (req) => chatService.chat(req),
    {
      model,
      messages,
      temperature: 0.5,
      maxTokens: 512,
    },
  );

  const estimatedCostUsd = tokenManager.estimateCostUsd(response.model, response.usage);

  return {
    answer: response.content,
    model: response.model,
    provider: response.provider,
    latencyMs: response.latencyMs,
    usage: response.usage,
    estimatedCostUsd,
  };
}
