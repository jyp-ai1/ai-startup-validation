import type { ExecutionPlan } from '@/features/agents/orchestrator';
import type { DecisionResult } from '@/features/decision';
import type { ExecutiveWorkspaceViewModel } from '@/features/executive';

/** Context passed to section builders when assembling a report. */
export type ReportBuildContext = {
  workspace: ExecutiveWorkspaceViewModel;
  decision: DecisionResult;
  orchestratorPlan: ExecutionPlan | null;
  locale: import('@repo/i18n/config').AppLocale;
};
