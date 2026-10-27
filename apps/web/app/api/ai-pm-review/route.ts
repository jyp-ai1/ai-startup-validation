import { OpenAIProviderAdapter } from '@repo/ai';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { getServerAuthUser } from '@/lib/auth/server-auth';
import { extractDocumentText } from '@/lib/intake/extract-document-text';
import {
  reviewInputFromParts,
  runFirstReview,
  toAiPmReviewView,
} from '@/features/business-validation-journey/lib/ai-pm-review';
import { openAiPmReviewStore } from '@/features/business-validation-journey/lib/ai-pm-review-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function storePath(): string {
  return process.env.AI_PM_REVIEW_DB_PATH?.trim() || join(process.cwd(), '.data', 'ai-pm-reviews.sqlite');
}

function openStore() {
  mkdirSync(join(process.cwd(), '.data'), { recursive: true });
  return openAiPmReviewStore(storePath());
}

export async function GET() {
  const user = await getServerAuthUser();
  if (!user) return Response.json({ error: 'login_required', reviews: [] }, { status: 401 });
  const store = openStore();
  try {
    const feedback = store.listFeedback(user.id);
    const reviews = store.listReviews(user.id).map((record) => toAiPmReviewView(record, feedback));
    return Response.json({ reviews });
  } finally {
    store.close();
  }
}

export async function POST(request: Request) {
  const user = await getServerAuthUser();
  if (!user) return Response.json({ error: 'login_required', review: null }, { status: 401 });

  const contentType = request.headers.get('content-type') ?? '';
  let typed = '';
  let extracted = '';
  let fileName: string | null = null;
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    typed = String(form.get('text') ?? '');
    const file = form.get('file');
    if (file instanceof File && file.size > 0) {
      if (file.size > 1_500_000) {
        return Response.json({ error: 'file_too_large', review: null }, { status: 400 });
      }
      const extractedResult = await extractDocumentText(
        Buffer.from(await file.arrayBuffer()),
        file.name,
        file.type,
      );
      if (!extractedResult.ok) {
        const error = extractedResult.reason === 'unsupported' ? 'unsupported' : 'unreadable_file';
        return Response.json({ error, review: null }, { status: 400 });
      }
      extracted = extractedResult.text;
      fileName = file.name;
    }
  } else {
    const body = (await request.json()) as { text?: string };
    typed = body.text ?? '';
  }

  const parts = reviewInputFromParts({ typed, extracted, fileName });
  if (!parts.ok) return Response.json({ error: parts.error, review: null }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const store = openStore();
  try {
    const result = await runFirstReview({
      store,
      userId: user.id,
      text: parts.text,
      origin: parts.origin,
      fileName: parts.fileName,
      now: new Date().toISOString(),
      evidence: apiKey ? 'live_network' : 'not_run',
      chat: apiKey
        ? (chatRequest) => new OpenAIProviderAdapter({ apiKey }).chat(chatRequest)
        : undefined,
    });
    return Response.json({ reused: !result.called, review: result.view });
  } finally {
    store.close();
  }
}
