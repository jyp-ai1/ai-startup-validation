import mammoth from 'mammoth';

import type { SmartIntakeImportSource } from '@/features/workflow-journey/lib/v2-smart-intake-types';

export type DocumentExtractionResult =
  | { ok: true; text: string; source: SmartIntakeImportSource }
  | { ok: false; reason: 'unsupported' | 'empty' | 'parse_failed'; detail?: string };

const MIN_EXTRACTED_CHARS = 8;

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? 'txt';
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    return parsed.text?.trim() ?? '';
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? '';
}

/** Server-side document text extraction for intake uploads. */
export async function extractDocumentText(
  buffer: Buffer,
  fileName: string,
): Promise<DocumentExtractionResult> {
  const ext = extensionOf(fileName);

  if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
    const text = buffer.toString('utf8').trim();
    if (text.length < MIN_EXTRACTED_CHARS) {
      return { ok: false, reason: 'empty' };
    }
    return { ok: true, text, source: ext === 'txt' ? 'txt' : 'md' };
  }

  if (ext === 'pdf') {
    try {
      const text = await extractPdfText(buffer);
      if (text.length < MIN_EXTRACTED_CHARS) {
        return { ok: false, reason: 'empty', detail: 'PDF has no extractable text' };
      }
      return { ok: true, text, source: 'pdf' };
    } catch (error) {
      return {
        ok: false,
        reason: 'parse_failed',
        detail: error instanceof Error ? error.message : 'PDF parse failed',
      };
    }
  }

  if (ext === 'docx' || ext === 'doc') {
    try {
      const text = await extractDocxText(buffer);
      if (text.length < MIN_EXTRACTED_CHARS) {
        return { ok: false, reason: 'empty', detail: 'DOCX has no extractable text' };
      }
      return { ok: true, text, source: 'docx' };
    } catch (error) {
      return {
        ok: false,
        reason: 'parse_failed',
        detail: error instanceof Error ? error.message : 'DOCX parse failed',
      };
    }
  }

  return { ok: false, reason: 'unsupported' };
}
