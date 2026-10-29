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

/** Drops the first-review purpose lines so a stored envelope still matches the business body. */
export function stripReviewIntakeLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^(검토 목적|현재 단계|가장 알고 싶은 것):/.test(line.trim()))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Text used to attach a stored review. The intake wrapper is not part of the review input. */
export function businessBodyForReviewMatch(text: string): string {
  const stripped = stripReviewIntakeLines(text);
  const parsed = parseIntakeSeedDocument(stripped).businessDescription?.replace(/\s+/g, ' ').trim() ?? '';
  if (parsed.length >= 8) return parsed;
  return stripped.replace(/\s+/g, ' ').trim();
}

/** True when line is project metadata, not business substance. */
export function isProjectMetadataLine(line: string): boolean {
  const t = line.trim();
  return /^프로젝트\s*이름:/i.test(t) || /^사업\s*설명:$/i.test(t);
}
