import { createSuccessResponse, handleUnknownError } from '@repo/core/response';

import { getOpsDashboardStats } from '@/lib/analytics/server/ops-store';

export async function GET() {
  try {
    return Response.json(createSuccessResponse(getOpsDashboardStats()));
  } catch (error) {
    const apiError = handleUnknownError(error);
    return Response.json(apiError, { status: 500 });
  }
}
