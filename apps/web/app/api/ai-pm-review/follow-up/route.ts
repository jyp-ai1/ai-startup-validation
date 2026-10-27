import { OpenAIProviderAdapter } from '@repo/ai';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { getServerAuthUser } from '@/lib/auth/server-auth';
import { runFollowUpReview } from '@/features/business-validation-journey/lib/ai-pm-review';
import { openAiPmReviewStore } from '@/features/business-validation-journey/lib/ai-pm-review-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function storePath(): string {
  return process.env.AI_PM_REVIEW_DB_PATH?.trim() || join(process.cwd(), '.data', 'ai-pm-reviews.sqlite');
}

export async function POST(request: Request) {
  const user = await getServerAuthUser();
  if (!user) return Response.json({ error: 'login_required', review: null }, { status: 401 });
  const body = (await request.json()) as { reviewId?: string; supplement?: string };
  mkdirSync(join(process.cwd(), '.data'), { recursive: true });
  const store = openAiPmReviewStore(storePath());
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  try {
    const result = await runFollowUpReview({
      store,
      userId: user.id,
      reviewId: body.reviewId?.trim() ?? '',
      supplement: body.supplement,
      now: new Date().toISOString(),
      evidence: apiKey ? 'live_network' : 'not_run',
      chat: apiKey
        ? (chatRequest) => new OpenAIProviderAdapter({ apiKey }).chat(chatRequest)
        : undefined,
    });
    if (!result.ok) return Response.json({ error: result.error, review: null }, { status: 400 });
    return Response.json({ reused: !result.called, review: result.view });
  } finally {
    store.close();
  }
}
