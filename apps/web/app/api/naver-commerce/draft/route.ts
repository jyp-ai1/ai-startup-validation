import { createErrorResponse, createSuccessResponse } from '@repo/core/response';
import { NextResponse } from 'next/server';

import { updateDraft, uploadDraftToNaver } from '@/modules/naver-commerce/services/draft-service';
import type { ProductDraft, SaveDraftInput } from '@/modules/naver-commerce/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveDraftInput & { draft: ProductDraft };
    if (!body.draft?.id) {
      return NextResponse.json(createErrorResponse('INVALID_INPUT', 'Draft is required'), {
        status: 400,
      });
    }

    const updated = await updateDraft({ draft: body.draft, edits: body.edits });
    const upload = await uploadDraftToNaver(updated);

    return NextResponse.json(createSuccessResponse({ draft: updated, upload }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(createErrorResponse('INTERNAL_ERROR', message), { status: 500 });
  }
}
