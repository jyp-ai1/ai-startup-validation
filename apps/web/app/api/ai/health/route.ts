import { createSuccessResponse, handleUnknownError } from '@repo/core/response';
import {
  aiEnv,
  getAIPlatform,
  isProviderConfigured,
  openRouterHealth,
  resolveDefaultModel,
} from '@repo/ai';

export async function GET() {
  try {
    const platform = getAIPlatform();
    const stats = platform.observability.getStats();
    const openrouterConfigured = isProviderConfigured('openrouter');

    let openrouterHealth: { ok: boolean; latencyMs: number } | null = null;
    if (openrouterConfigured && aiEnv.OPENROUTER_API_KEY) {
      openrouterHealth = await openRouterHealth(aiEnv.OPENROUTER_API_KEY);
    }

    return Response.json(
      createSuccessResponse({
        status: openrouterHealth?.ok === false ? 'degraded' : 'ok',
        provider: 'openrouter',
        model: resolveDefaultModel('openrouter'),
        openrouterConfigured,
        openrouterHealth,
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
