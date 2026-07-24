import { chatService, chatWithFallback, promptBuilder, resolveDefaultModel } from '@repo/ai';

import type { DecisionInput, DecisionProvider, DecisionResult, DecisionVerdict } from '../decision-types';
import { MockDecisionProvider } from './mock-decision-provider';

type DecisionLlmJson = {
  verdict?: DecisionVerdict;
  executiveSummary?: string[];
  reasons?: string[];
};

function parseDecisionJson(content: string): DecisionLlmJson {
  try {
    return JSON.parse(content) as DecisionLlmJson;
  } catch {
    return { executiveSummary: [content.slice(0, 400)] };
  }
}

function isValidVerdict(value: unknown): value is DecisionVerdict {
  return value === 'GO' || value === 'HOLD' || value === 'NO_GO';
}

/** Gemini via OpenRouter — structured decision with LLM executive summary (L3.1). */
export class OpenRouterDecisionProvider implements DecisionProvider {
  readonly id = 'gemini' as const;
  private readonly mockProvider = new MockDecisionProvider();

  async generate(input: DecisionInput): Promise<DecisionResult> {
    const base = await this.mockProvider.generate(input);

    const messages = promptBuilder.buildMessages(
      {
        projectTitle: input.projectTitle,
        locale: input.locale,
        researchTotal: String(input.research.total),
        evidenceTotal: String(input.evidence.total),
        evidenceHigh: String(input.evidence.highConfidence),
        vocTotal: String(input.voc.total),
        competitorTotal: String(input.competitors.total),
        validationScore: input.validationScore?.totalScore?.toString() ?? 'n/a',
        mockVerdict: base.verdict,
      },
      'decision',
      'v1',
    );

    const response = await chatWithFallback(
      (req) => chatService.chat(req),
      {
        model: resolveDefaultModel('openrouter'),
        messages,
        temperature: 0.35,
        maxTokens: 700,
        responseFormat: { type: 'json_object' },
      },
    );

    const parsed = parseDecisionJson(response.content);
    const verdict = isValidVerdict(parsed.verdict) ? parsed.verdict : base.verdict;

    const executiveSummaryText =
      parsed.executiveSummary?.filter((line) => line.trim().length > 0) ??
      undefined;

    const reasonTexts =
      parsed.reasons?.slice(0, 3).map((text, index) => ({
        id: `ai-r${index + 1}`,
        text,
      })) ?? undefined;

    return {
      ...base,
      verdict,
      executiveSummaryText,
      reasonTexts,
      providerId: response.provider === 'openai' ? 'openai' : 'gemini',
      generatedAt: new Date().toISOString(),
    };
  }
}

export const openRouterDecisionProvider = new OpenRouterDecisionProvider();
