import type { BusinessProgressDimension } from '../../lib/founder-intelligence-engine';

export const STAGES = [
  { key: 'marketValidation', progressKey: 'market', threshold: 60 },
  { key: 'customerValidation', progressKey: 'customer', threshold: 40 },
  { key: 'pricingValidation', progressKey: 'pricing', threshold: 50 },
  { key: 'mvp', progressKey: 'customer', threshold: 70 },
  { key: 'investmentPrep', progressKey: 'investment', threshold: 50 },
] as const;

export type JourneyStageStatus = 'done' | 'running' | 'upcoming';

export function resolveJourneyStageStatuses(
  businessProgress: BusinessProgressDimension[],
): JourneyStageStatus[] {
  let runningAssigned = false;

  return STAGES.map((stage) => {
    const percent =
      businessProgress.find((dim) => dim.key === stage.progressKey)?.percent ?? 0;

    if (percent >= stage.threshold) return 'done';
    if (!runningAssigned) {
      runningAssigned = true;
      return 'running';
    }
    return 'upcoming';
  });
}
