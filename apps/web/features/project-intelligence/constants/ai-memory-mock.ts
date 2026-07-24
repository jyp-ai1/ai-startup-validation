export type AiMemoryItem = {
  id: string;
  category: 'decision' | 'goal' | 'risk' | 'progress' | 'workflow';
  labelKey: string;
  valueKey: string;
};

export const AI_MEMORY: AiMemoryItem[] = [
  { id: 'm1', category: 'decision', labelKey: 'lastDecision', valueKey: 'holdJul23' },
  { id: 'm2', category: 'goal', labelKey: 'primaryGoal', valueKey: 'viability' },
  { id: 'm3', category: 'risk', labelKey: 'topRisk', valueKey: 'vocGap' },
  { id: 'm4', category: 'progress', labelKey: 'lastProgress', valueKey: 'marketDone' },
  { id: 'm5', category: 'workflow', labelKey: 'activeStep', valueKey: 'vocStep' },
];
