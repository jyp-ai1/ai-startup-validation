import { isBaseError } from '@repo/core/errors';
import { createSuccessResponse, handleUnknownError } from '@repo/core/response';
import { parseRequest, z } from '@repo/core/validation';
import { runStrategyPipelineWithRecovery } from '@repo/agents';

import { resolveAgentProviderId } from '@/lib/agents/config';

const bodySchema = z.object({
  projectId: z.string().min(1),
  projectTitle: z.string().min(1),
  ideaSummary: z.string().min(1),
  goalId: z.string().min(1),
  industry: z.string().optional(),
  locale: z.string().default('ko'),
  previousSuccessScore: z.number().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = parseRequest(bodySchema, json);
    const result = await runStrategyPipelineWithRecovery({
      project: { ...body, locale: body.locale ?? 'ko' },
      providerId: resolveAgentProviderId(),
      previousSuccessScore: body.previousSuccessScore,
    });
    return Response.json(createSuccessResponse(result));
  } catch (error) {
    const apiError = handleUnknownError(error);
    const status = isBaseError(error) ? error.statusCode : 500;
    return Response.json(apiError, { status });
  }
}
