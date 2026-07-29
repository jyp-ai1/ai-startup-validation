/**
 * P0-6 — Strip internal/metadata from user-facing AI PM copy.
 * Never show raw filenames, paths, OCR brackets, or markdown artifacts.
 */

const FILE_EXT_PATTERN = /\.(pdf|docx|doc|txt|md|markdown|hwp|pptx|xlsx)$/i;

/** `[[name] foo.pdf]]`, `[[filename.pdf]]`, `[filename]` */
const NESTED_BRACKET_FILE_PATTERN = /\[\[[\s\S]*?\.(?:pdf|docx|doc|txt|md|hwp|pptx|xlsx)[\s\S]*?\]\]/gi;
const BRACKET_FILE_PATTERN = /\[\[?\s*[^\]\n]{1,120}\.(pdf|docx|doc|txt|md|hwp|pptx|xlsx)\s*\]?\]?/gi;
const DOUBLE_BRACKET_PATTERN = /\[\[[^\]]{1,200}\]\]/g;
const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*\]\([^)]*\)/g;
const MARKDOWN_HEADER_PATTERN = /^#{1,6}\s+/gm;
const WINDOWS_PATH_PATTERN = /[A-Za-z]:\\[^\s\n]+/g;
const UNIX_PATH_PATTERN = /(?:\/(?:usr|var|tmp|home|Users|Documents|GitHub)[^\s\n]*)/g;
const OCR_PAGE_PATTERN = /(?:^|\s)(?:p\.?\s*)?\d+\s*\/\s*\d+(?:\s|$)/gi;

function stripKnownPlaceholders(text: string): string {
  return text
    .replace(/PDF 문서를 불러왔습니다[^\n]*/gi, '')
    .replace(/Word 문서를 불러왔습니다[^\n]*/gi, '')
    .replace(/AI PM이 문서 구조를 분석합니다[^\n]*/gi, '')
    .replace(/AI PM이 핵심 섹션을 추출합니다[^\n]*/gi, '');
}

/** Sanitize text before showing in AI PM UI (strip, main, bubbles). */
export function sanitizeAiPmResponse(raw: string): string {
  if (!raw?.trim()) return '';

  let text = raw.trim();
  text = stripKnownPlaceholders(text);
  text = text.replace(NESTED_BRACKET_FILE_PATTERN, '');
  text = text.replace(BRACKET_FILE_PATTERN, '');
  text = text.replace(DOUBLE_BRACKET_PATTERN, '');
  text = text.replace(MARKDOWN_LINK_PATTERN, '');
  text = text.replace(MARKDOWN_HEADER_PATTERN, '');
  text = text.replace(WINDOWS_PATH_PATTERN, '');
  text = text.replace(UNIX_PATH_PATTERN, '');
  text = text.replace(OCR_PAGE_PATTERN, ' ');
  text = text.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1');
  text = text.replace(/\s{2,}/g, ' ').trim();

  return text;
}

/** User-safe document label — never raw upload filename. */
export function sanitizeDocumentLabel(fileName?: string | null): string {
  if (!fileName?.trim()) return '사업계획서';

  let label = fileName.trim();
  label = label.replace(/^[\[\("']+|[\]\)"']+$/g, '');
  label = label.replace(FILE_EXT_PATTERN, '');
  label = label.replace(/[_-]+/g, ' ').trim();

  if (!label || label.length > 48 || FILE_EXT_PATTERN.test(label)) {
    return '사업계획서';
  }

  if (/제\d+회|\.pdf|\.docx|\[\[/i.test(label)) {
    return '사업계획서';
  }

  if (/^(doc|document|untitled|새\s*문서)/i.test(label)) {
    return '사업계획서';
  }

  return label;
}

/** Opening line when a document was imported — no filename. */
export function buildDocumentReviewIntro(): string {
  return '사업계획서를 검토했습니다. 현재 확인한 내용은 다음과 같습니다.';
}

/** Sanitize each paragraph for AI PM message blocks. */
export function sanitizeAiPmParagraphs(paragraphs: string[]): string[] {
  return paragraphs
    .map((p) => sanitizeAiPmResponse(p))
    .filter((p) => p.length > 0);
}
