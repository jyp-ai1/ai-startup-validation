export const MIN_WORKSPACE_DOCUMENT_CHARS = 8;

/** Single-line project titles must not trigger AI analysis. */
export function isWorkspaceDocumentAnalyzable(text: string | null | undefined): boolean {
  const trimmed = text?.trim() ?? '';
  if (trimmed.length < MIN_WORKSPACE_DOCUMENT_CHARS) return false;

  const lines = trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) return true;

  return trimmed.length >= 40;
}
