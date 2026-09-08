import { NextResponse } from 'next/server';

import { extractDocumentText } from '@/lib/intake/extract-document-text';

export const runtime = 'nodejs';

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: 'missing_file' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, reason: 'too_large' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await extractDocumentText(buffer, file.name);

  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    text: result.text,
    source: result.source,
    fileName: file.name,
    extractedLength: result.text.length,
  });
}
