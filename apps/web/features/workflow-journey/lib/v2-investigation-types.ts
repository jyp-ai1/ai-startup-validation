export type InvestigationLogEntryId =
  | 'googleTrends'
  | 'competitors'
  | 'reddit'
  | 'productHunt'
  | 'documentAnalysis'
  | 'governmentSupport'
  | 'investmentTrend'
  | 'tourismCases'
  | 'reportGenerated';

export type LiveInvestigationStepId =
  | 'googleTrends'
  | 'productHunt'
  | 'crunchbase'
  | 'reddit'
  | 'competitors'
  | 'documentAnalysis'
  | 'governmentSupport'
  | 'investmentTrend';

export type SmartQuestionId =
  | 'paidConversionTiming'
  | 'paidConversionKpi'
  | 'pricingModelGap'
  | 'customerInterviewGap';

export type InvestigationScheduleHour = '6' | '8' | '9';

export type InvestigationSchedule = {
  hour: InvestigationScheduleHour;
  weekdaysOnly: boolean;
};

export type DailyReportTimelineId =
  | 'started'
  | 'googleTrends'
  | 'reddit'
  | 'governmentSupport'
  | 'competitors'
  | 'aiAnalysis'
  | 'founderReport';

export type WorkProgressItemId = 'market' | 'competition' | 'pricing' | 'government' | 'news';

export type WorkProgressStatus = 'done' | 'inProgress' | 'pending';

export type DiscoveryId =
  | 'newCompetitor'
  | 'searchVolume'
  | 'governmentGrant'
  | 'opinionChange';

export type InvestigationLogEntry = {
  id: InvestigationLogEntryId;
  /** Minutes before now when this step completed; -1 = in progress */
  minutesAgo: number;
  findingKey?: string;
  durationMinutes?: number;
};

export type DailyReportEntry = {
  id: DailyReportTimelineId;
  /** Minutes before now when this step completed */
  minutesAgo: number;
};

export type WorkProgressItem = {
  id: WorkProgressItemId;
  status: WorkProgressStatus;
};

export type DiscoveryItem = {
  id: DiscoveryId;
};

export type SmartQuestion = {
  id: SmartQuestionId;
  citationId?: string;
};

export type PmReportStats = {
  durationMinutes: number;
  dataPoints: number;
  opinions: number;
  decisions: number;
};

export type MorningBriefing = {
  durationMinutes: number;
  highlightKeys: string[];
  focusKey: string;
};

export type InvestigationContext = {
  logEntries: InvestigationLogEntry[];
  liveSteps: LiveInvestigationStepId[];
  smartQuestions: SmartQuestion[];
  report: PmReportStats;
  hasDocument: boolean;
  /** Workspace-only — absent in Demo flow (P0-1). */
  morningBriefing?: MorningBriefing;
  /** Workspace-only — absent in Demo flow (P0-1). */
  dailyReport?: DailyReportEntry[];
  workProgress: WorkProgressItem[];
  discoveries: DiscoveryItem[];
  scheduleHour: InvestigationScheduleHour;
  reportDate: string;
  /** demo = live session investigation; workspace = morning/returning */
  surface?: 'demo' | 'workspace';
};
