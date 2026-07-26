import { runStrategyPipelineWithRecovery } from '@repo/agents';
import { getAIPlatform } from '@repo/ai';
import { isBaseError } from '@repo/core/errors';
import { createSuccessResponse, handleUnknownError } from '@repo/core/response';
import { parseRequest, z } from '@repo/core/validation';

import { resolveAgentProviderId } from '@/lib/agents/config';
import { buildSnapshotFromPipeline } from '@/features/workflow-journey/lib/founder-background-ai';

const bodySchema = z.object({
  projectId: z.string().min(1),
  projectTitle: z.string().min(1),
  ideaSummary: z.string().min(1),
  goalId: z.string().min(1),
  locale: z.string().default('ko'),
  previousSuccessScore: z.number().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = parseRequest(bodySchema, json);
    getAIPlatform();

    const result = await runStrategyPipelineWithRecovery({
      project: { ...body, locale: body.locale ?? 'ko' },
      providerId: resolveAgentProviderId(),
      previousSuccessScore: body.previousSuccessScore,
    });

    const snapshot = buildSnapshotFromPipeline(body.projectId, result);

    return Response.json(
      createSuccessResponse({
        snapshot,
        pipeline: result,
      }),
    );
  } catch (error) {
    const apiError = handleUnknownError(error);
    const status = isBaseError(error) ? error.statusCode : 500;
    return Response.json(apiError, { status });
  }
}

/** Vercel Cron entry — set CRON_SECRET in env and add cron in vercel.json */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (secret && auth !== `Bearer ${secret}`) {
    return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  return Response.json({
    success: true,
    message: 'Overnight research cron ready. POST with project context to run.',
  });
}
