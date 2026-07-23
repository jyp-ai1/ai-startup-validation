import { createSuccessResponse } from '@repo/core/response';

import { getBuildInfo } from '@/lib/analytics/server/build-info';

export async function GET() {
  const info = getBuildInfo();
  return Response.json(createSuccessResponse({ version: info.version, name: 'LaunchLens' }));
}
