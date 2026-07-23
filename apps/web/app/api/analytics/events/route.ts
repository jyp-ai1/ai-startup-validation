import { createSuccessResponse, handleUnknownError } from '@repo/core/response';

import type { AnalyticsEventPayload } from '@/lib/analytics/types';
import { recordAnalyticsEvent } from '@/lib/analytics/server/ops-store';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyticsEventPayload;
    if (!body?.name || !body?.timestamp) {
      return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }
    recordAnalyticsEvent(body);
    return Response.json(createSuccessResponse({ recorded: true }));
  } catch (error) {
    const apiError = handleUnknownError(error);
    return Response.json(apiError, { status: 500 });
  }
}
