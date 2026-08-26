import type { StartupProject } from '@repo/types/validation';

import { buildProjectIntakeSeed } from './build-project-intake-seed';

/**
 * Extract Workspace seed document.
 * Prefer pasted onboarding content; always ensure title reaches Understanding.
 */
export function extractProjectSeedDocument(project: StartupProject): string | undefined {
  const ctx = project.onboardingContext;
  let pasted: string | undefined;

  if (ctx && typeof ctx === 'object') {
    const v2Demo = (ctx as Record<string, unknown>).v2Demo;
    if (v2Demo && typeof v2Demo === 'object') {
      const content = (v2Demo as Record<string, unknown>).pastedContent;
      if (typeof content === 'string' && content.trim().length >= 8) {
        pasted = content.trim();
      }
    }
  }

  const title = project.title?.trim() ?? '';
  const summary = project.summary?.trim() ?? '';

  if (pasted) {
    // Ensure title is present even if older creates stored description-only paste.
    if (title.length >= 2 && !pasted.includes(title) && !/^프로젝트 이름:/m.test(pasted)) {
      return `프로젝트 이름: ${title}\n\n${pasted}`;
    }
    return pasted;
  }

  if (title.length >= 2 || summary.length >= 2) {
    return buildProjectIntakeSeed(title || '새 프로젝트', summary.length >= 2 ? summary : null);
  }

  return undefined;
}
