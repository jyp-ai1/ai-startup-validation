import type { StartupProject } from '@repo/types/validation';

/** Extract pasted demo/onboarding document for workspace seeding. */
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

  const summary = project.summary?.trim();
  if (summary && summary.length >= 8) {
    return summary;
  }

  return undefined;
}
