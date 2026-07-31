import type { StartupProject } from '@repo/types/validation';

/** Extract pasted onboarding document only — never title/summary (P0 new-project intake). */
export function extractProjectSeedDocument(project: StartupProject): string | undefined {
  const ctx = project.onboardingContext;
  if (!ctx || typeof ctx !== 'object') return undefined;

  const v2Demo = (ctx as Record<string, unknown>).v2Demo;
  if (v2Demo && typeof v2Demo === 'object') {
    const pasted = (v2Demo as Record<string, unknown>).pastedContent;
    if (typeof pasted === 'string' && pasted.trim().length >= 8) {
      return pasted.trim();
    }
  }

  return undefined;
}
