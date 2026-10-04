/**
 * Presentation only — Project Title never falls back to business source.
 */

import { parseIntakeSeedDocument } from '@/lib/project/parse-intake-seed';

export const UNTITLED_PROJECT_PLACEHOLDER = '이름 없는 프로젝트';

export function resolveProjectDisplayTitle(input: {
  projectTitle?: string | null;
  seedDocument?: string | null;
}): string {
  const titled = input.projectTitle?.trim();
  if (titled) return titled;

  const parsed = parseIntakeSeedDocument(input.seedDocument ?? '');
  const seedTitle = parsed.projectTitle?.trim();
  if (seedTitle) return seedTitle;

  return UNTITLED_PROJECT_PLACEHOLDER;
}

export function resolveBusinessSourceText(input: {
  seedDocument?: string | null;
  storedDocument?: string | null;
}): string {
  const stored = input.storedDocument?.trim() ?? '';
  if (stored) {
    const parsed = parseIntakeSeedDocument(stored);
    return parsed.businessDescription?.trim() || stored;
  }
  const seed = input.seedDocument?.trim() ?? '';
  if (!seed) return '';
  const parsed = parseIntakeSeedDocument(seed);
  return parsed.businessDescription?.trim() || seed;
}
