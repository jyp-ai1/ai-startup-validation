import { createSuccessResponse, handleUnknownError } from '@repo/core/response';

import { getBuildInfo } from '@/lib/analytics/server/build-info';

export async function GET() {
  try {
    const info = getBuildInfo();
    return Response.json(createSuccessResponse({ version: info.version, name: 'LaunchLens' }));
  } catch (error) {
    const apiError = handleUnknownError(error);
    return Response.json(apiError, { status: 500 });
  }
}
