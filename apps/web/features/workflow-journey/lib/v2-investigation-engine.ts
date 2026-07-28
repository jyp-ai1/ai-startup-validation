import type {
  InvestigationContext,
  InvestigationLogEntry,
  LiveInvestigationStepId,
  SmartQuestion,
} from './v2-investigation-types';
import type { SmartIntakeAnalysis, SmartIntakeImportSource } from './v2-smart-intake-types';

export const SAMPLE_LIVE_STEPS: LiveInvestigationStepId[] = [
  'googleTrends',
  'productHunt',
  'crunchbase',
  'reddit',
  'competitors',
  'governmentSupport',
];

export const SAMPLE_LOG_ENTRIES: InvestigationLogEntry[] = [
  { id: 'googleTrends', time: '09:31' },
  { id: 'competitors', time: '09:32' },
  { id: 'reddit', time: '09:33' },
  { id: 'productHunt', time: '09:34' },
  { id: 'governmentSupport', time: '09:35' },
  { id: 'reportGenerated', time: '09:36' },
];

export const SMART_INTAKE_LIVE_STEPS: LiveInvestigationStepId[] = [
  'googleTrends',
  'productHunt',
  'reddit',
  'competitors',
  'documentAnalysis',
  'governmentSupport',
];

const SAMPLE_REPORT = {
  durationMinutes: 12,
  dataPoints: 132,
  opinions: 3,
  decisions: 1,
};

export function buildSampleInvestigationContext(): InvestigationContext {
  return {
    logEntries: SAMPLE_LOG_ENTRIES,
    liveSteps: SAMPLE_LIVE_STEPS,
    smartQuestions: [],
    report: SAMPLE_REPORT,
    hasDocument: false,
  };
}

export function buildSmartIntakeInvestigationContext(
  analysis: SmartIntakeAnalysis,
  source: SmartIntakeImportSource,
  fileName?: string,
): InvestigationContext {
  const hasDocument = source === 'pdf' && !!fileName;

  const logEntries: InvestigationLogEntry[] = hasDocument
    ? [
        { id: 'googleTrends', time: '09:31' },
        { id: 'competitors', time: '09:32' },
        { id: 'reddit', time: '09:33' },
        { id: 'documentAnalysis', time: '09:34' },
        { id: 'governmentSupport', time: '09:35' },
        { id: 'reportGenerated', time: '09:36' },
      ]
    : [
        { id: 'googleTrends', time: '09:31' },
        { id: 'competitors', time: '09:32' },
        { id: 'productHunt', time: '09:33' },
        { id: 'reddit', time: '09:34' },
        { id: 'reportGenerated', time: '09:35' },
      ];

  const smartQuestions: SmartQuestion[] = hasDocument
    ? [{ id: 'paidConversionTiming', citationId: 'bm-vague' }]
    : analysis.missing.includes('pricing')
      ? [{ id: 'pricingModelGap' }]
      : [{ id: 'paidConversionKpi' }];

  return {
    logEntries,
    liveSteps: hasDocument
      ? SMART_INTAKE_LIVE_STEPS
      : SMART_INTAKE_LIVE_STEPS.filter((step) => step !== 'documentAnalysis'),
    smartQuestions,
    report: {
      durationMinutes: hasDocument ? 12 : 9,
      dataPoints: hasDocument ? 132 : 86,
      opinions: 3,
      decisions: 1,
    },
    hasDocument,
  };
}

export function mapWorkingStepsToLiveProgress(
  completedWorkingSteps: number,
  totalWorkingSteps: number,
  liveSteps: LiveInvestigationStepId[],
): number {
  if (totalWorkingSteps <= 0) return 0;
  const ratio = completedWorkingSteps / totalWorkingSteps;
  return Math.min(liveSteps.length, Math.ceil(ratio * liveSteps.length));
}
