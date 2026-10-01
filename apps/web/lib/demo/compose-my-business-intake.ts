/** Merge CEO paste + uploaded document into one analyzable canonical doc (My Business). */
export function composeMyBusinessIntakeDocument(input: {
  paste?: string;
  fileText?: string;
  fileName?: string | null;
}): string {
  const parts: string[] = [];
  const paste = input.paste?.trim() ?? '';
  const fileText = input.fileText?.trim() ?? '';
  if (paste) parts.push(paste);
  if (fileText) {
    const header = input.fileName?.trim()
      ? `--- 첨부: ${input.fileName.trim()} ---`
      : '--- 첨부 문서 ---';
    parts.push(`${header}\n${fileText}`);
  }
  return parts.join('\n\n').trim();
}
