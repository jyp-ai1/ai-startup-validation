/** Target ~500–1000 tokens using character heuristics (~4 chars per token). */
const DEFAULT_MIN_CHARS = 1500;
const DEFAULT_MAX_CHARS = 3500;

export type ChunkTextOptions = {
  minChars?: number;
  maxChars?: number;
};

export type TextChunk = {
  content: string;
  index: number;
};

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+|\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Split long evidence content into retrieval-sized chunks. */
export function chunkText(text: string, options?: ChunkTextOptions): TextChunk[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const minChars = options?.minChars ?? DEFAULT_MIN_CHARS;
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;

  if (normalized.length <= maxChars) {
    return [{ content: normalized, index: 0 }];
  }

  const paragraphs = splitParagraphs(normalized);
  const chunks: TextChunk[] = [];
  let buffer = '';

  function flushBuffer() {
    if (!buffer.trim()) return;
    chunks.push({ content: buffer.trim(), index: chunks.length });
    buffer = '';
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      flushBuffer();
      const sentences = splitSentences(paragraph);
      for (const sentence of sentences) {
        if (`${buffer}\n\n${sentence}`.trim().length > maxChars && buffer.length >= minChars) {
          flushBuffer();
        }
        buffer = buffer ? `${buffer}\n\n${sentence}` : sentence;
        if (buffer.length >= maxChars) {
          flushBuffer();
        }
      }
      continue;
    }

    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && buffer.length >= minChars) {
      flushBuffer();
      buffer = paragraph;
    } else {
      buffer = candidate;
    }
  }

  flushBuffer();
  return chunks.length > 0 ? chunks : [{ content: normalized.slice(0, maxChars), index: 0 }];
}

/** Build searchable document text from evidence fields. */
export function buildEvidenceDocumentContent(input: {
  title: string;
  summary: string;
  content?: string | null;
  sourceName?: string | null;
  category?: string;
}): string {
  const parts = [`# ${input.title}`, input.summary];
  if (input.sourceName?.trim()) {
    parts.push(`Source: ${input.sourceName.trim()}`);
  }
  if (input.category) {
    parts.push(`Category: ${input.category}`);
  }
  if (input.content?.trim()) {
    parts.push(input.content.trim());
  }
  return parts.join('\n\n');
}
