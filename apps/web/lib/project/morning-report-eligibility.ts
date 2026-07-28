import type { StartupProject } from '@repo/types/validation';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Morning Report is Workspace-only — not on first day unless prior investigation exists. */
export function shouldShowMorningReport(project: StartupProject): boolean {
  const createdDay = startOfDay(new Date(project.createdAt));
  const today = startOfDay(new Date());
  const createdBeforeToday = createdDay.getTime() < today.getTime();

  const ctx = project.onboardingContext as Record<string, unknown> | null | undefined;
  const v2Demo = ctx?.v2Demo as Record<string, unknown> | undefined;
  const lastInvestigationAt =
    typeof v2Demo?.lastInvestigationAt === 'string' ? v2Demo.lastInvestigationAt : null;

  return createdBeforeToday || Boolean(lastInvestigationAt);
}
