export type TimelineEntry = {
  id: string;
  type: 'decision' | 'confidence' | 'activity' | 'milestone';
  labelKey: string;
  detailKey?: string;
  value?: string;
  at: string;
};

export const DECISION_TIMELINE: TimelineEntry[] = [
  { id: 't1', type: 'milestone', labelKey: 'projectStart', at: '2026-07-20T10:00:00Z' },
  { id: 't2', type: 'activity', labelKey: 'marketDone', at: '2026-07-21T15:00:00Z' },
  { id: 't3', type: 'confidence', labelKey: 'confidenceUp', value: '42→62', at: '2026-07-22T11:00:00Z' },
  { id: 't4', type: 'decision', labelKey: 'holdConfirmed', value: 'HOLD', at: '2026-07-23T09:30:00Z' },
  { id: 't5', type: 'activity', labelKey: 'competitorAdded', at: '2026-07-24T08:00:00Z' },
];
