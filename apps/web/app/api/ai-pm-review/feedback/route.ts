import { getServerAuthUser } from '@/lib/auth/server-auth';
import { openReviewBackend } from '@/features/business-validation-journey/lib/ai-pm-review-backend';
import { saveReviewFeedback } from '@/features/business-validation-journey/lib/ai-pm-review';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getServerAuthUser();
  if (!user) return Response.json({ error: 'login_required', review: null }, { status: 401 });
  const backend = openReviewBackend();
  try {
    const saved = await saveReviewFeedback({
      store: backend.store,
      userId: user.id,
      body: await request.json(),
      now: new Date().toISOString(),
    });
    if (!saved.ok) return Response.json({ error: saved.error, review: null, storage: backend.storage }, { status: 400 });
    return Response.json({ review: saved.view, storage: backend.storage });
  } catch {
    return Response.json(
      { error: 'storage_unavailable', review: null, storage: { ...backend.storage, durable: false, productionDatabase: false } },
      { status: 503 },
    );
  } finally {
    backend.store.close();
  }
}
