/** Real-time AI PM feedback while the founder types their one-line idea. */

export type OnboardingFeedbackPhase = 'welcome' | 'typing' | 'ready';

const READY_CHAR_THRESHOLD = 20;

export function getOnboardingFeedbackPhase(textLength: number): OnboardingFeedbackPhase {
  if (textLength === 0) return 'welcome';
  if (textLength < READY_CHAR_THRESHOLD) return 'typing';
  return 'ready';
}

export function buildOnboardingMessageKeys(
  phase: OnboardingFeedbackPhase,
): Array<'greeting' | 'askIdea' | 'oneLineEnough' | 'typingFeedback' | 'readyFeedback'> {
  const keys: Array<
    'greeting' | 'askIdea' | 'oneLineEnough' | 'typingFeedback' | 'readyFeedback'
  > = ['greeting', 'askIdea', 'oneLineEnough'];

  if (phase === 'typing' || phase === 'ready') {
    keys.push('typingFeedback');
  }
  if (phase === 'ready') {
    keys.push('readyFeedback');
  }

  return keys;
}
