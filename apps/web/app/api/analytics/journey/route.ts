import { createSuccessResponse, handleUnknownError } from '@repo/core/response';
import { analyticsEventRepository, isSupabaseAdminConfigured } from '@repo/db';

import { getServerAuthUser } from '@/lib/auth/server-auth';
import { env } from '@repo/core/env';

async function assertAdminApiAccess(): Promise<Response | null> {
  const user = await getServerAuthUser();
  const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!user || !adminEmail || user.email.trim().toLowerCase() !== adminEmail) {
    return Response.json({ success: false, error: { message: 'Forbidden' } }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const forbidden = await assertAdminApiAccess();
    if (forbidden) return forbidden;

    if (!isSupabaseAdminConfigured()) {
      return Response.json(
        createSuccessResponse({ sessions: [], journey: [], source: 'unconfigured' }),
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const journey = await analyticsEventRepository.listSessionJourney(sessionId);
      return Response.json(createSuccessResponse({ journey, sessionId }));
    }

    const sessions = await analyticsEventRepository.listJourneySessions(30);
    return Response.json(createSuccessResponse({ sessions }));
  } catch (error) {
    const apiError = handleUnknownError(error);
    return Response.json(apiError, { status: 500 });
  }
}
