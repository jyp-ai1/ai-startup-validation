/**
 * Sprint 4.8 — Closed Alpha full funnel (16 steps).
 * See docs/EVENT_TAXONOMY.md
 */

export const CLOSED_ALPHA_FUNNEL_STEPS = [
  'landing',
  'demoStart',
  'sampleSelected',
  'investigationFinished',
  'evidenceOpened',
  'smartQuestionAnswered',
  'reviewCompleted',
  'strategyChanged',
  'myProjectStarted',
  'login',
  'workspace',
  'secondReview',
  'artifact',
  'returnVisit',
  'morningReportView',
  'founderMemoWritten',
] as const;

export type ClosedAlphaFunnelStep = (typeof CLOSED_ALPHA_FUNNEL_STEPS)[number];

export type ClosedAlphaFunnelCounts = Record<ClosedAlphaFunnelStep, number>;

export const CLOSED_ALPHA_FUNNEL_LABELS: Record<ClosedAlphaFunnelStep, string> = {
  landing: 'Landing',
  demoStart: 'Demo start',
  sampleSelected: 'Sample project',
  investigationFinished: 'Investigation done',
  evidenceOpened: 'Evidence opened',
  smartQuestionAnswered: 'First question',
  reviewCompleted: 'First review',
  strategyChanged: 'Strategy improved',
  myProjectStarted: 'My project start',
  login: 'Login',
  workspace: 'Workspace',
  secondReview: '2nd review',
  artifact: 'Artifact',
  returnVisit: 'Return visit',
  morningReportView: 'Morning report',
  founderMemoWritten: 'Founder memo',
};

/** Mock baseline — tapers like real alpha drop-off. */
export const MOCK_CLOSED_ALPHA_FUNNEL: ClosedAlphaFunnelCounts = {
  landing: 100,
  demoStart: 72,
  sampleSelected: 65,
  investigationFinished: 58,
  evidenceOpened: 51,
  smartQuestionAnswered: 44,
  reviewCompleted: 38,
  strategyChanged: 32,
  myProjectStarted: 28,
  login: 24,
  workspace: 20,
  secondReview: 14,
  artifact: 11,
  returnVisit: 8,
  morningReportView: 6,
  founderMemoWritten: 4,
};
