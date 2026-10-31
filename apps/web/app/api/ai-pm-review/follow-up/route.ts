import { getServerAuthUser } from '@/lib/auth/server-auth';
import { requireOwnedProject } from '@/features/business-validation-journey/lib/ai-pm-review-access';
import { openReviewBackend } from '@/features/business-validation-journey/lib/ai-pm-review-backend';
import { openReviewChat, readGptApiKey, submitConsultingStage, type StageAnswerInput } from '@/features/business-validation-journey/lib/ai-pm-review';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getServerAuthUser();
  if (!user) return Response.json({ error: 'login_required', review: null }, { status: 401 });
  const body = (await request.json()) as {
    reviewId?: string;
    projectId?: string;
    allowPartial?: boolean;
    answers?: StageAnswerInput[];
  };
  const access = await requireOwnedProject(user.id, body.projectId);
  if (!access.ok) return Response.json({ error: access.error, review: null }, { status: access.status });
  const backend = openReviewBackend();
  const apiKey = readGptApiKey();
  try {
    const result = await submitConsultingStage({
      store: backend.store,
      userId: user.id,
      projectId: access.projectId,
      reviewId: body.reviewId?.trim() ?? '',
      answers: Array.isArray(body.answers) ? body.answers : [],
      allowPartial: body.allowPartial === true,
      now: new Date().toISOString(),
      evidence: apiKey ? 'live_network' : 'not_run',
      notRunReason: apiKey ? undefined : 'gpt_api_key_missing',
      chat: apiKey ? openReviewChat() : undefined,
    });
    if (!result.ok) return Response.json({ error: result.error, review: result.view ?? null, storage: backend.storage }, { status: 400 });
    return Response.json({
      reused: !result.called && !result.pending,
      called: result.called,
      pending: result.pending,
      review: result.view,
      storage: backend.storage,
    });
  } catch {
    return Response.json(
      { error: 'storage_unavailable', review: null, storage: { ...backend.storage, durable: false, productionDatabase: false } },
      { status: 503 },
    );
  } finally {
    backend.store.close();
  }
}
