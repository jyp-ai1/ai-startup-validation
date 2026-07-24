import type { ProviderId, TokenUsage } from '../types';

export type ModelPricing = {
  inputPer1M: number;
  outputPer1M: number;
};

/** Provider pricing abstraction — update as vendor prices change. */
export const DEFAULT_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'claude-sonnet-4-20250514': { inputPer1M: 3, outputPer1M: 15 },
  'gemini-2.0-flash': { inputPer1M: 0.1, outputPer1M: 0.4 },
  'google/gemini-2.5-flash': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'text-embedding-3-small': { inputPer1M: 0.02, outputPer1M: 0 },
  'llama3.2': { inputPer1M: 0, outputPer1M: 0 },
};

/** Estimate token count from text (rough heuristic). */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Token and cost estimation manager. */
export class TokenManager {
  constructor(private readonly pricing: Record<string, ModelPricing> = DEFAULT_PRICING) {}

  setPricing(modelId: string, pricing: ModelPricing): void {
    this.pricing[modelId] = pricing;
  }

  estimateTokens(text: string): number {
    return estimateTokenCount(text);
  }

  estimateUsage(inputText: string, outputText: string): TokenUsage {
    const inputTokens = this.estimateTokens(inputText);
    const outputTokens = this.estimateTokens(outputText);
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  estimateCost(modelId: string, usage: TokenUsage): number {
    const pricing = this.pricing[modelId] ?? { inputPer1M: 0, outputPer1M: 0 };
    const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (usage.outputTokens / 1_000_000) * pricing.outputPer1M;
    return inputCost + outputCost;
  }

  estimateCostUsd(modelId: string, usage: TokenUsage): number {
    return this.estimateCost(modelId, usage);
  }

  getPricing(modelId: string): ModelPricing {
    return this.pricing[modelId] ?? { inputPer1M: 0, outputPer1M: 0 };
  }
}

export const tokenManager = new TokenManager();

export type TokenBudget = {
  maxInputTokens: number;
  maxOutputTokens: number;
  maxTotalTokens: number;
};

export function isWithinBudget(usage: TokenUsage, budget: TokenBudget): boolean {
  return (
    usage.inputTokens <= budget.maxInputTokens &&
    usage.outputTokens <= budget.maxOutputTokens &&
    usage.totalTokens <= budget.maxTotalTokens
  );
}

export type { ProviderId };
