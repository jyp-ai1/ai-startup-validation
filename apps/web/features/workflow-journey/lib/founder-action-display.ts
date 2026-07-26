import type { GeneratedTodayAction } from './founder-intelligence-engine';

type ActionTitleTranslator = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export function resolveFounderActionTitle(
  action: GeneratedTodayAction | undefined,
  td: ActionTitleTranslator,
  fallback: string,
): string {
  if (!action) return fallback;
  if (action.title) return action.title;

  if (action.titleKey === 'vocInterview') {
    return td('vocInterview', action.titleParams ?? {});
  }
  if (action.titleKey === 'primaryStep') {
    return td('primaryStep', action.titleParams ?? { step: '1' });
  }
  if (action.titleKey) {
    return td(action.titleKey, action.titleParams ?? {});
  }

  return fallback;
}
