import { createSuccessResponse } from '@repo/core/response';

import { getBuildInfo } from '@/lib/analytics/server/build-info';

export async function GET() {
  return Response.json(createSuccessResponse(getBuildInfo()));
}
