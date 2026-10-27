import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { getServerAuthUser } from '@/lib/auth/server-auth';
import { saveReviewFeedback } from '@/features/business-validation-journey/lib/ai-pm-review';
import { openAiPmReviewStore } from '@/features/business-validation-journey/lib/ai-pm-review-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function storePath(): string {
  return process.env.AI_PM_REVIEW_DB_PATH?.trim() || join(process.cwd(), '.data', 'ai-pm-reviews.sqlite');
}

export async function POST(request: Request) {
  const user = await getServerAuthUser();
  if (!user) return Response.json({ error: 'login_required', review: null }, { status: 401 });
  mkdirSync(join(process.cwd(), '.data'), { recursive: true });
  const store = openAiPmReviewStore(storePath());
  try {
    const saved = saveReviewFeedback({
      store,
      userId: user.id,
      body: await request.json(),
      now: new Date().toISOString(),
    });
    if (!saved.ok) return Response.json({ error: saved.error, review: null }, { status: 400 });
    return Response.json({ review: saved.view });
  } finally {
    store.close();
  }
}
