import { buildCompanyKnowledgeGraph, runIntelligencePlatform } from '@repo/agents';
import { getAIPlatform } from '@repo/ai';
import { isBaseError } from '@repo/core/errors';
import { createSuccessResponse, handleUnknownError } from '@repo/core/response';
import { parseRequest, z } from '@repo/core/validation';

import { resolveAgentProviderId } from '@/lib/agents/config';

const bodySchema = z.object({
  projectId: z.string().min(1),
  projectTitle: z.string().min(1),
  ideaSummary: z.string().min(1),
  goalId: z.string().min(1),
  industry: z.string().optional(),
  locale: z.string().default('ko'),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = parseRequest(bodySchema, json);
    getAIPlatform();

    const context = { ...body, locale: body.locale ?? 'ko' };
    const intelligence = await runIntelligencePlatform({
      context,
      providerId: resolveAgentProviderId(),
    });
    const knowledgeGraph = buildCompanyKnowledgeGraph(context, intelligence);

    return Response.json(createSuccessResponse({ intelligence, knowledgeGraph }));
  } catch (error) {
    const apiError = handleUnknownError(error);
    const status = isBaseError(error) ? error.statusCode : 500;
    return Response.json(apiError, { status });
  }
}
