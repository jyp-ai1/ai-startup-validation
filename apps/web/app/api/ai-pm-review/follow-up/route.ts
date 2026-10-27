import { OpenAIProviderAdapter } from '@repo/ai';

import { getServerAuthUser } from '@/lib/auth/server-auth';
import { openReviewBackend } from '@/features/business-validation-journey/lib/ai-pm-review-backend';
import { readGptApiKey, runFollowUpReview } from '@/features/business-validation-journey/lib/ai-pm-review';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getServerAuthUser();
  if (!user) return Response.json({ error: 'login_required', review: null }, { status: 401 });
  const body = (await request.json()) as { reviewId?: string; supplement?: string };
  const backend = openReviewBackend();
  const apiKey = readGptApiKey();
  try {
    const result = await runFollowUpReview({
      store: backend.store,
      userId: user.id,
      reviewId: body.reviewId?.trim() ?? '',
      supplement: body.supplement,
      now: new Date().toISOString(),
      evidence: apiKey ? 'live_network' : 'not_run',
      notRunReason: apiKey ? undefined : 'gpt_api_key_missing',
      chat: apiKey
        ? (chatRequest) => new OpenAIProviderAdapter({ apiKey }).chat(chatRequest)
        : undefined,
    });
    if (!result.ok) return Response.json({ error: result.error, review: null, storage: backend.storage }, { status: 400 });
    return Response.json({ reused: !result.called, review: result.view, storage: backend.storage });
  } catch {
    return Response.json(
      { error: 'storage_unavailable', review: null, storage: { ...backend.storage, durable: false, productionDatabase: false } },
      { status: 503 },
    );
  } finally {
    backend.store.close();
  }
}
