/**
 * DAY 8-I P0 FIX-10 — Parse project intake seed: title ≠ business description.
 */

export type ParsedIntakeSeed = {
  projectTitle: string | null;
  businessDescription: string | null;
  /** Best candidate for business one-liner — never the project title alone. */
  businessOneLinerCandidate: string | null;
};

export function parseIntakeSeedDocument(text: string): ParsedIntakeSeed {
  const lines = text.split('\n');
  let projectTitle: string | null = null;
  let inDescription = false;
  const descLines: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const titleMatch = line.match(/^프로젝트\s*이름:\s*(.+)$/i);
    if (titleMatch) {
      projectTitle = titleMatch[1]?.trim() || null;
      continue;
    }

    if (/^사업\s*설명:/i.test(line)) {
      inDescription = true;
      const inline = line.replace(/^사업\s*설명:\s*/i, '').trim();
      if (inline) descLines.push(inline);
      continue;
    }

    if (inDescription) {
      descLines.push(line);
    }
  }

  const businessDescription = descLines.join(' ').trim() || null;
  const businessOneLinerCandidate =
    businessDescription && businessDescription.length >= 8 ? businessDescription : null;

  return { projectTitle, businessDescription, businessOneLinerCandidate };
}

/** True when line is project metadata, not business substance. */
export function isProjectMetadataLine(line: string): boolean {
  const t = line.trim();
  return /^프로젝트\s*이름:/i.test(t) || /^사업\s*설명:$/i.test(t);
}
