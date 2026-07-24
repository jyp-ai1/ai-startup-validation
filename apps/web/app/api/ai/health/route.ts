import { createSuccessResponse, handleUnknownError } from '@repo/core/response';
import {
  aiEnv,
  getAIPlatform,
  isProviderConfigured,
  openAIHealth,
  openRouterHealth,
  resolveDefaultModel,
  resolveFallbackModel,
} from '@repo/ai';

export async function GET() {
  try {
    const platform = getAIPlatform();
    const stats = platform.observability.getStats();
    const openrouterConfigured = isProviderConfigured('openrouter');
    const openaiConfigured = isProviderConfigured('openai');

    let openrouterHealth: { ok: boolean; latencyMs: number } | null = null;
    if (openrouterConfigured && aiEnv.OPENROUTER_API_KEY) {
      openrouterHealth = await openRouterHealth(aiEnv.OPENROUTER_API_KEY);
    }

    let openaiHealthResult: { ok: boolean; latencyMs: number } | null = null;
    if (openaiConfigured && aiEnv.OPENAI_API_KEY) {
      openaiHealthResult = await openAIHealth(aiEnv.OPENAI_API_KEY);
    }

    const primaryOk = openrouterHealth?.ok !== false && openaiHealthResult?.ok !== false;
    const hasLiveProvider = openrouterConfigured || openaiConfigured;

    return Response.json(
      createSuccessResponse({
        status: primaryOk || !hasLiveProvider ? 'ok' : 'degraded',
        provider: openrouterConfigured ? 'openrouter' : openaiConfigured ? 'openai' : 'mock',
        model: resolveDefaultModel('openrouter'),
        fallbackModel: resolveFallbackModel(),
        openrouterConfigured,
        openrouterHealth,
        openaiConfigured,
        openaiHealth: openaiHealthResult,
        tokenStats: {
          totalRequests: stats.totalRequests,
          avgLatencyMs: Math.round(stats.avgLatencyMs),
          totalTokens: stats.totalTokens,
          totalCostUsd: Number(stats.totalCostUsd.toFixed(6)),
          successRate: Number((stats.successRate * 100).toFixed(1)),
        },
      }),
    );
  } catch (error) {
    const apiError = handleUnknownError(error);
    return Response.json(apiError, { status: 500 });
  }
}
