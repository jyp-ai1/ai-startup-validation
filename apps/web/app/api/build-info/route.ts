import { createSuccessResponse, handleUnknownError } from '@repo/core/response';

import { getBuildInfo } from '@/lib/analytics/server/build-info';

export async function GET() {
  try {
    return Response.json(createSuccessResponse(getBuildInfo()));
  } catch (error) {
    const apiError = handleUnknownError(error);
    return Response.json(apiError, { status: 500 });
  }
}
