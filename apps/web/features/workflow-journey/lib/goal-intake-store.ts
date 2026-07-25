const GOAL_INTAKE_KEY = 'll_goal_intake';

export function readGoalIntakeIdea(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = sessionStorage.getItem(GOAL_INTAKE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { idea?: string };
    return parsed.idea?.trim() ?? '';
  } catch {
    return '';
  }
}
