import { createErrorResponse, createSuccessResponse } from '@repo/core/response';
import { NextResponse } from 'next/server';

import { runProductPipeline } from '@/modules/naver-commerce/services/pipeline-service';
import type { ImportProductInput } from '@/modules/naver-commerce/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportProductInput;

    const result = await runProductPipeline({
      url: body.url ?? 'test',
      traceId: body.traceId,
      skipAi: body.skipAi ?? false,
    });

    if (!result.success) {
      return NextResponse.json(
        createErrorResponse('PIPELINE_FAILED', result.error ?? 'Pipeline failed'),
        { status: 422 },
      );
    }

    return NextResponse.json(createSuccessResponse(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(createErrorResponse('INTERNAL_ERROR', message), { status: 500 });
  }
}
