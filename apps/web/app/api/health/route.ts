import { createSuccessResponse, handleUnknownError } from '@repo/core/response';

import { getBuildInfo } from '@/lib/analytics/server/build-info';

export async function GET() {
  try {
    const info = getBuildInfo();
    return Response.json(
      createSuccessResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: info.version,
        commit: info.commit,
        environment: info.environment,
        gaConfigured: info.gaConfigured,
      }),
    );
  } catch (error) {
    const apiError = handleUnknownError(error);
    return Response.json(apiError, { status: 500 });
  }
}
