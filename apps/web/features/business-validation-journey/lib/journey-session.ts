import type { JourneyState } from './journey-types';

export const JOURNEY_SESSION_KEY = 'alabom.validationJourney.v1';

function isDraft(value: unknown): value is JourneyState {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<JourneyState>;
  return (
    draft.researchStatus === 'research_not_run' &&
    draft.counterReviewStatus === 'counter_review_not_run' &&
    draft.judgmentStatus === 'judgment_deferred' &&
    Array.isArray(draft.answers) &&
    typeof draft.intake?.business === 'string'
  );
}

export function loadJourneyDraft(): JourneyState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(JOURNEY_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveJourneyDraft(state: JourneyState): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(JOURNEY_SESSION_KEY, JSON.stringify(state));
}
