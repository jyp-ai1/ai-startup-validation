import { createRequire } from 'node:module';

import mammoth from 'mammoth';

import type { SmartIntakeImportSource } from '@/features/workflow-journey/lib/v2-smart-intake-types';

export type DocumentExtractionResult =
  | { ok: true; text: string; source: SmartIntakeImportSource }
  | {
      ok: false;
      reason: 'unsupported' | 'empty' | 'parse_failed' | 'image_pdf';
      detail?: string;
    };

export type DocumentKind = 'txt' | 'md' | 'pdf' | 'docx' | 'unsupported';

const MIN_EXTRACTED_CHARS = 8;

type PdfParseModule = {
  PDFParse: new (options: { data: Buffer | Uint8Array }) => {
    getText: () => Promise<{ text?: string }>;
    destroy: () => Promise<void>;
  };
};

function extensionOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function looksLikePdfMagic(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 5).toString('latin1');
  return head.startsWith('%PDF');
}

function looksLikeZipMagic(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

export function detectDocumentKind(
  fileName: string,
  buffer: Buffer,
  mimeType?: string | null,
): DocumentKind {
  const ext = extensionOf(fileName);
  const mime = (mimeType ?? '').toLowerCase();

  if (looksLikePdfMagic(buffer) || ext === 'pdf' || mime === 'application/pdf') {
    return 'pdf';
  }
  if (
    ext === 'docx' ||
    ext === 'doc' ||
    mime.includes('wordprocessingml') ||
    mime === 'application/msword'
  ) {
    return 'docx';
  }
  if (ext === 'md' || ext === 'markdown' || mime === 'text/markdown') {
    return 'md';
  }
  if (ext === 'txt' || mime.startsWith('text/plain')) {
    return 'txt';
  }
  if (looksLikeZipMagic(buffer)) return 'docx';
  return 'unsupported';
}

function ensurePdfNodeGlobals() {
  const globalObject = globalThis as typeof globalThis & { DOMMatrix?: unknown };
  if (typeof globalObject.DOMMatrix !== 'undefined') return;

  class DOMMatrixShim {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;

    constructor(init?: string | number[]) {
      if (Array.isArray(init) && init.length >= 6) {
        const [a, b, c, d, e, f] = init;
        this.a = a ?? 1;
        this.b = b ?? 0;
        this.c = c ?? 0;
        this.d = d ?? 1;
        this.e = e ?? 0;
        this.f = f ?? 0;
      }
    }

    multiplySelf() {
      return this;
    }

    preMultiplySelf() {
      return this;
    }

    invertSelf() {
      return this;
    }

    translateSelf(tx = 0, ty = 0) {
      this.e += tx;
      this.f += ty;
      return this;
    }

    scaleSelf(sx = 1, sy = sx) {
      this.a *= sx;
      this.d *= sy;
      return this;
    }

    rotateSelf() {
      return this;
    }

    transformPoint(point: { x: number; y: number }) {
      return { x: point.x, y: point.y, z: 0, w: 1 };
    }
  }

  globalObject.DOMMatrix = DOMMatrixShim;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  ensurePdfNodeGlobals();
  const require = createRequire(import.meta.url);
  const { PDFParse } = require('pdf-parse') as PdfParseModule;
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
  mimeType?: string | null,
): Promise<DocumentExtractionResult> {
  const kind = detectDocumentKind(fileName, buffer, mimeType);

  if (kind === 'txt' || kind === 'md') {
    const text = buffer.toString('utf8').trim();
    if (text.length < MIN_EXTRACTED_CHARS) {
      return { ok: false, reason: 'empty' };
    }
    return { ok: true, text, source: kind === 'txt' ? 'txt' : 'md' };
  }

  if (kind === 'pdf') {
    if (!looksLikePdfMagic(buffer)) {
      return { ok: false, reason: 'parse_failed', detail: 'File is not a PDF' };
    }
    try {
      const text = await extractPdfText(buffer);
      if (text.length < MIN_EXTRACTED_CHARS) {
        return {
          ok: false,
          reason: 'image_pdf',
          detail: 'PDF has no extractable text',
        };
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

  if (kind === 'docx') {
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
