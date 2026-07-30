import type {
  DiscoveryItem,
  DailyReportEntry,
  InvestigationContext,
  InvestigationLogEntry,
  InvestigationScheduleHour,
  LiveInvestigationStepId,
  MorningBriefing,
  SmartQuestion,
  WorkProgressItem,
} from './v2-investigation-types';
import type {
  SmartIntakeAnalysis,
  SmartIntakeImportSource,
  SmartIntakeMissingId,
} from './v2-smart-intake-types';
import { getActiveProjectId } from '@/lib/project/project-context-store';

/** @deprecated Use project-scoped keys via scheduleHourKey(). */
export const INVESTIGATION_SCHEDULE_KEY = 'll_investigation_schedule_hour';
/** @deprecated Use project-scoped keys via scheduleWeekdaysKey(). */
export const INVESTIGATION_SCHEDULE_WEEKDAYS_KEY = 'll_investigation_schedule_weekdays';

function resolveScheduleScope(projectId?: string): string {
  return projectId ?? getActiveProjectId() ?? 'demo';
}

function scheduleHourKey(projectId?: string): string {
  return `launchlens.workflow.${resolveScheduleScope(projectId)}.scheduleHour`;
}

function scheduleWeekdaysKey(projectId?: string): string {
  return `launchlens.workflow.${resolveScheduleScope(projectId)}.scheduleWeekdays`;
}

export const DEFAULT_SCHEDULE_HOUR: InvestigationScheduleHour = '8';

export const SAMPLE_LIVE_STEPS: LiveInvestigationStepId[] = [
  'googleTrends',
  'productHunt',
  'crunchbase',
  'reddit',
  'competitors',
  'governmentSupport',
  'investmentTrend',
];

export const SMART_INTAKE_LIVE_STEPS: LiveInvestigationStepId[] = [
  'googleTrends',
  'productHunt',
  'reddit',
  'competitors',
  'documentAnalysis',
  'governmentSupport',
  'investmentTrend',
];

const SAMPLE_WORK_LOG: InvestigationLogEntry[] = [
  { id: 'googleTrends', minutesAgo: 9, findingKey: 'googleTrends', durationMinutes: 2 },
  { id: 'reddit', minutesAgo: 7, findingKey: 'reddit', durationMinutes: 2 },
  { id: 'governmentSupport', minutesAgo: 6, findingKey: 'governmentSupport', durationMinutes: 1 },
  { id: 'competitors', minutesAgo: 3, findingKey: 'competitors', durationMinutes: 3 },
  { id: 'productHunt', minutesAgo: 2, findingKey: 'productHunt', durationMinutes: 1 },
  { id: 'investmentTrend', minutesAgo: 1, findingKey: 'investmentTrend', durationMinutes: 1 },
  { id: 'reportGenerated', minutesAgo: 0, findingKey: 'reportGenerated', durationMinutes: 1 },
];

const SAMPLE_DAILY_REPORT: DailyReportEntry[] = [
  { id: 'started', minutesAgo: 12 },
  { id: 'googleTrends', minutesAgo: 9 },
  { id: 'reddit', minutesAgo: 7 },
  { id: 'governmentSupport', minutesAgo: 6 },
  { id: 'competitors', minutesAgo: 3 },
  { id: 'aiAnalysis', minutesAgo: 1 },
  { id: 'founderReport', minutesAgo: 0 },
];

const SAMPLE_WORK_PROGRESS: WorkProgressItem[] = [
  { id: 'market', status: 'done' },
  { id: 'competition', status: 'done' },
  { id: 'pricing', status: 'inProgress' },
  { id: 'government', status: 'done' },
  { id: 'news', status: 'done' },
];

const SAMPLE_DISCOVERIES: DiscoveryItem[] = [
  { id: 'newCompetitor' },
  { id: 'searchVolume' },
  { id: 'governmentGrant' },
  { id: 'opinionChange' },
];

const SAMPLE_MORNING: MorningBriefing = {
  durationMinutes: 11,
  highlightKeys: ['newCompetitors', 'searchVolume', 'governmentGrant'],
  focusKey: 'pricingStrategy',
};

const SAMPLE_REPORT = {
  durationMinutes: 11,
  dataPoints: 132,
  opinions: 3,
  decisions: 1,
};

function buildMorningBriefing(
  focusKey: string,
  durationMinutes: number,
  highlightKeys: string[],
): MorningBriefing {
  return {
    durationMinutes,
    highlightKeys,
    focusKey,
  };
}

function buildDailyReport(): DailyReportEntry[] {
  return SAMPLE_DAILY_REPORT;
}

function buildWorkLog(hasDocument: boolean): InvestigationLogEntry[] {
  if (hasDocument) {
    return [
      { id: 'googleTrends', minutesAgo: 9, findingKey: 'googleTrends', durationMinutes: 2 },
      { id: 'reddit', minutesAgo: 7, findingKey: 'reddit', durationMinutes: 2 },
      { id: 'documentAnalysis', minutesAgo: 5, findingKey: 'documentAnalysis', durationMinutes: 3 },
      { id: 'competitors', minutesAgo: 3, findingKey: 'competitors', durationMinutes: 2 },
      { id: 'governmentSupport', minutesAgo: 2, findingKey: 'governmentSupport', durationMinutes: 1 },
      { id: 'reportGenerated', minutesAgo: 0, findingKey: 'reportGenerated', durationMinutes: 1 },
    ];
  }
  return SAMPLE_WORK_LOG;
}

function buildWorkProgress(missing: SmartIntakeMissingId[]): WorkProgressItem[] {
  const pricingStatus = missing.includes('pricing') ? 'inProgress' : 'done';
  return [
    { id: 'market', status: 'done' },
    { id: 'competition', status: 'done' },
    { id: 'pricing', status: pricingStatus },
    { id: 'government', status: 'done' },
    { id: 'news', status: 'done' },
  ];
}

function buildSmartQuestions(
  analysis: SmartIntakeAnalysis,
  hasDocument: boolean,
): SmartQuestion[] {
  const questions: SmartQuestion[] = [];
  if (analysis.missing.includes('pricing')) {
    questions.push(
      hasDocument
        ? { id: 'paidConversionTiming', citationId: 'bm-vague' }
        : { id: 'pricingModelGap' },
    );
  }
  if (analysis.missing.includes('customerInterview') && questions.length < 2) {
    questions.push({ id: 'customerInterviewGap' });
  }
  return questions.slice(0, 2);
}

function buildDiscoveries(hasDocument: boolean): DiscoveryItem[] {
  if (hasDocument) {
    return [
      { id: 'searchVolume' },
      { id: 'governmentGrant' },
      { id: 'opinionChange' },
    ];
  }
  return SAMPLE_DISCOVERIES;
}

export function buildSampleInvestigationContext(): InvestigationContext {
  return {
    logEntries: SAMPLE_WORK_LOG,
    liveSteps: SAMPLE_LIVE_STEPS,
    smartQuestions: [],
    report: SAMPLE_REPORT,
    hasDocument: false,
    morningBriefing: SAMPLE_MORNING,
    dailyReport: buildDailyReport(),
    workProgress: SAMPLE_WORK_PROGRESS,
    discoveries: SAMPLE_DISCOVERIES,
    scheduleHour: DEFAULT_SCHEDULE_HOUR,
    reportDate: '2026.08.01',
    surface: 'workspace',
  };
}

/** Demo flow — no Morning Report / Daily Report (P0-1). */
export function buildDemoInvestigationContext(): InvestigationContext {
  return {
    logEntries: SAMPLE_WORK_LOG,
    liveSteps: SAMPLE_LIVE_STEPS,
    smartQuestions: [],
    report: SAMPLE_REPORT,
    hasDocument: false,
    workProgress: SAMPLE_WORK_PROGRESS,
    discoveries: SAMPLE_DISCOVERIES,
    scheduleHour: DEFAULT_SCHEDULE_HOUR,
    reportDate: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    surface: 'demo',
  };
}

export function buildSmartIntakeInvestigationContext(
  analysis: SmartIntakeAnalysis,
  source: SmartIntakeImportSource,
  fileName?: string,
): InvestigationContext {
  const hasDocument = source === 'pdf' && !!fileName;
  const workLog = buildWorkLog(hasDocument);
  const smartQuestions = buildSmartQuestions(analysis, hasDocument);

  return {
    logEntries: workLog,
    liveSteps: hasDocument
      ? SMART_INTAKE_LIVE_STEPS
      : SMART_INTAKE_LIVE_STEPS.filter((step) => step !== 'documentAnalysis'),
    smartQuestions,
    report: {
      durationMinutes: hasDocument ? 12 : 11,
      dataPoints: hasDocument ? 132 : 98,
      opinions: 3,
      decisions: 1,
    },
    hasDocument,
    workProgress: buildWorkProgress(analysis.missing),
    discoveries: buildDiscoveries(hasDocument),
    scheduleHour: DEFAULT_SCHEDULE_HOUR,
    reportDate: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    surface: 'demo',
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

export function loadInvestigationScheduleHour(projectId?: string): InvestigationScheduleHour {
  if (typeof window === 'undefined') return DEFAULT_SCHEDULE_HOUR;
  const scoped = localStorage.getItem(scheduleHourKey(projectId));
  const raw = scoped ?? localStorage.getItem(INVESTIGATION_SCHEDULE_KEY);
  if (raw === '6' || raw === '8' || raw === '9') return raw;
  return DEFAULT_SCHEDULE_HOUR;
}

export function saveInvestigationScheduleHour(
  hour: InvestigationScheduleHour,
  projectId?: string,
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(scheduleHourKey(projectId), hour);
}

export function loadInvestigationScheduleWeekdaysOnly(projectId?: string): boolean {
  if (typeof window === 'undefined') return true;
  const scoped = localStorage.getItem(scheduleWeekdaysKey(projectId));
  const raw = scoped ?? localStorage.getItem(INVESTIGATION_SCHEDULE_WEEKDAYS_KEY);
  if (raw === '0') return false;
  if (raw === '1') return true;
  return true;
}

export function saveInvestigationScheduleWeekdaysOnly(
  weekdaysOnly: boolean,
  projectId?: string,
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(scheduleWeekdaysKey(projectId), weekdaysOnly ? '1' : '0');
}

export function loadInvestigationSchedule(projectId?: string): {
  hour: InvestigationScheduleHour;
  weekdaysOnly: boolean;
} {
  return {
    hour: loadInvestigationScheduleHour(projectId),
    weekdaysOnly: loadInvestigationScheduleWeekdaysOnly(projectId),
  };
}

export function countWorkProgressDone(items: WorkProgressItem[]): { done: number; total: number } {
  const done = items.filter((item) => item.status === 'done').length;
  return { done, total: items.length };
}
