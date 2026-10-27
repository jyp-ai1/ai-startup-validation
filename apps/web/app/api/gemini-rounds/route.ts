import { GoogleProviderAdapter, readGoogleOutputTokenCeiling } from '@repo/ai';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { getServerAuthUser } from '@/lib/auth/server-auth';
import { decideGeminiLiveCall, recoverGeminiRound } from '@/features/business-validation-journey/lib/gemini-round-recovery';
import { openGeminiRoundStore } from '@/features/business-validation-journey/lib/gemini-round-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RoundBody = {
  executionId?: string;
  round?: number;
  business?: string;
  customer?: string;
  problem?: string;
  feedback?: string;
  parentExecutionId?: string;
};

function storePath(): string {
  return process.env.GEMINI_ROUND_DB_PATH?.trim() || join(process.cwd(), '.data', 'gemini-rounds.sqlite');
}

export async function GET() {
  const user = await getServerAuthUser();
  if (!user) {
    return Response.json(
      { liveCall: 'NOT_RUN', error: 'login_required', records: [], content: null },
      { status: 401 },
    );
  }
  const store = openGeminiRoundStore(storePath());
  try {
    return Response.json({ records: store.list(user.id) });
  } finally {
    store.close();
  }
}

export async function POST(request: Request) {
  const user = await getServerAuthUser();
  if (!user) {
    return Response.json(
      { liveCall: 'NOT_RUN', error: 'login_required', record: null, content: null },
      { status: 401 },
    );
  }

  const body = (await request.json()) as RoundBody;
  const executionId = body.executionId?.trim() ?? '';
  const round = body.round === 2 ? 2 : body.round === 1 ? 1 : 0;
  const business = body.business?.trim() ?? '';
  if (!executionId || (round !== 1 && round !== 2) || !business) {
    return Response.json(
      {
        liveCall: 'NOT_RUN',
        error: 'business_required',
        record: null,
        content: null,
      },
      { status: 400 },
    );
  }
  if (round === 2 && !body.feedback?.trim()) {
    return Response.json(
      { liveCall: 'NOT_RUN', error: 'feedback_required', record: null, content: null },
      { status: 400 },
    );
  }
  if (round === 2 && !body.parentExecutionId?.trim()) {
    return Response.json(
      { liveCall: 'NOT_RUN', error: 'parent_required', record: null, content: null },
      { status: 400 },
    );
  }

  const decision = decideGeminiLiveCall();
  mkdirSync(join(process.cwd(), '.data'), { recursive: true });
  const store = openGeminiRoundStore(storePath());
  try {
    if (decision.evidence === 'not_run') {
      const result = await recoverGeminiRound({
        store,
        userId: user.id,
        executionId,
        round,
        business,
        customer: body.customer,
        problem: body.problem,
        feedback: body.feedback,
        parentExecutionId: body.parentExecutionId,
        now: new Date().toISOString(),
        maxTokens: 1,
        evidence: 'not_run',
        notRunReason: decision.reason,
      });
      return Response.json({
        liveCall: 'NOT_RUN',
        duplicate: result.duplicate,
        called: false,
        record: result.record,
      });
    }

    const ceiling = readGoogleOutputTokenCeiling();
    const adapter = new GoogleProviderAdapter({
      apiKey: process.env.GOOGLE_AI_API_KEY,
      maxOutputTokensCeiling: ceiling,
    });
    const result = await recoverGeminiRound({
      store,
      userId: user.id,
      executionId,
      round,
      business,
      customer: body.customer,
      problem: body.problem,
      feedback: body.feedback,
      parentExecutionId: body.parentExecutionId,
      now: new Date().toISOString(),
      maxTokens: ceiling ?? 1,
      evidence: 'live_network',
      chat: (chatRequest) => adapter.chat(chatRequest),
    });
    const liveCall =
      result.record.evidence === 'not_run' || !result.called
        ? 'NOT_RUN'
        : result.record.status === 'succeeded'
          ? 'LIVE'
          : 'FAILED';
    return Response.json({
      liveCall,
      duplicate: result.duplicate,
      called: result.called,
      record: result.record,
    });
  } finally {
    store.close();
  }
}
