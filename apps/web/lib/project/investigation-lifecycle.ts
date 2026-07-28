/** Investigation lifecycle — P0-5. UI renders from this state only. */

export type InvestigationLifecycleState =
  | 'IDLE'
  | 'INVESTIGATING'
  | 'ANALYZING'
  | 'REPORT_READY'
  | 'QUESTION'
  | 'RECOMMENDATION'
  | 'COMPLETE';

export function resolveDemoLifecycleStep(step: string): InvestigationLifecycleState {
  switch (step) {
    case 'investigating':
    case 'smartIntakeWorking':
      return 'INVESTIGATING';
    case 'inbox':
    case 'documentUnderstanding':
      return 'REPORT_READY';
    case 'evidence':
    case 'changeDetected':
      return 'ANALYZING';
    case 'opinion':
    case 'strategyImprovement':
      return 'RECOMMENDATION';
    case 'smartQuestion':
    case 'tryMyProject':
    case 'savePrompt':
      return 'QUESTION';
    case 'loginCta':
    case 'continuousManagement':
      return 'COMPLETE';
    default:
      return 'IDLE';
  }
}

export function resolveWorkspaceLifecycle(input: {
  showMorning: boolean;
  phase: 'inbox' | 'review';
  isFirstSession: boolean;
}): InvestigationLifecycleState {
  if (input.isFirstSession && !input.showMorning) return 'IDLE';
  if (input.phase === 'review') return 'RECOMMENDATION';
  if (input.showMorning) return 'REPORT_READY';
  return 'IDLE';
}
