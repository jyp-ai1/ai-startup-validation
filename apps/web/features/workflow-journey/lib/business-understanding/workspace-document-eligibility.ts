export const MIN_WORKSPACE_DOCUMENT_CHARS = 8;

const PDF_PLACEHOLDER_MARK = 'PDF 본문은 아직 추출되지 않았습니다';
const DOCX_PLACEHOLDER_MARKS = ['Word 사업계획서를 불러왔습니다', 'Word 문서를 불러왔습니다'] as const;

export type WorkspaceDocumentPlaceholderKind = 'pdf' | 'docx';

export type WorkspaceDocumentTrust =
  | { status: 'readable' }
  | {
      status: 'unreadable';
      kind: WorkspaceDocumentPlaceholderKind | 'insufficient';
      fileName?: string | null;
    };

/**
 * S7-1 Trust Contract — two gates (do not conflate):
 *
 * | API | Meaning | Use for |
 * |-----|---------|---------|
 * | isWorkspaceDocumentAnalyzable | Enough text shape to start loop / intake | Loop entry, paste submit, project seed |
 * | isWorkspaceDocumentReadable / canClaimDocumentWasRead | Real body extracted — AI may say "we read it" | Reading UX, diagnosis, header recap, partner copy |
 *
 * Remaining analyzable-only call sites (intentional): demo-start error branch, workspace-document-intake,
 * v2-strategy-workspace intake guard, my-project-actions seed, hasStoredWorkspaceDocument.
 */

/** Single-line project titles must not trigger AI analysis. */
export function isWorkspaceDocumentAnalyzable(text: string | null | undefined): boolean {
  const trimmed = text?.trim() ?? '';
  if (trimmed.length < MIN_WORKSPACE_DOCUMENT_CHARS) return false;

  const lines = trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) return true;

  return trimmed.length >= 40;
}

/** S7-1 Trust Contract — placeholder uploads are not "read" documents. */
export function detectWorkspaceDocumentPlaceholder(
  text: string | null | undefined,
): WorkspaceDocumentPlaceholderKind | null {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return null;
  if (trimmed.includes(PDF_PLACEHOLDER_MARK)) return 'pdf';
  if (DOCX_PLACEHOLDER_MARKS.some((mark) => trimmed.includes(mark))) return 'docx';
  return null;
}

export function extractPlaceholderFileName(text: string | null | undefined): string | null {
  const trimmed = text?.trim() ?? '';
  const match = trimmed.match(/^#\s*(.+?)(?:\n|$)/);
  return match?.[1]?.trim() ?? null;
}

/** S8-1 — never treat upload filenames as business names in UI copy. */
export function looksLikeDocumentFileName(text: string | null | undefined): boolean {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) return false;
  if (/\.(pdf|docx?|txt|md|hwp)$/i.test(trimmed)) return true;
  if (/^plan\.pdf$/i.test(trimmed)) return true;
  if (/[_\d]{6,}\.(pdf|docx?)$/i.test(trimmed)) return true;
  if (detectWorkspaceDocumentPlaceholder(trimmed) != null) return true;
  return false;
}

/** Trust Contract: analyzable shape is not enough — content must be real text. */
export function isWorkspaceDocumentReadable(text: string | null | undefined): boolean {
  if (!isWorkspaceDocumentAnalyzable(text)) return false;
  return detectWorkspaceDocumentPlaceholder(text) == null;
}

export function getWorkspaceDocumentTrust(text: string | null | undefined): WorkspaceDocumentTrust {
  const trimmed = text?.trim() ?? '';
  if (!isWorkspaceDocumentAnalyzable(trimmed)) {
    return { status: 'unreadable', kind: 'insufficient' };
  }
  const placeholder = detectWorkspaceDocumentPlaceholder(trimmed);
  if (placeholder) {
    return {
      status: 'unreadable',
      kind: placeholder,
      fileName: extractPlaceholderFileName(trimmed),
    };
  }
  return { status: 'readable' };
}

/** Alias — semantic name for Trust Contract copy gates. */
export const canClaimDocumentWasRead = isWorkspaceDocumentReadable;
