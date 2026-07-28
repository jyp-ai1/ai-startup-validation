export type InvestigationLogEntryId =
  | 'googleTrends'
  | 'competitors'
  | 'reddit'
  | 'productHunt'
  | 'documentAnalysis'
  | 'governmentSupport'
  | 'tourismCases'
  | 'reportGenerated';

export type LiveInvestigationStepId =
  | 'googleTrends'
  | 'productHunt'
  | 'crunchbase'
  | 'reddit'
  | 'competitors'
  | 'documentAnalysis'
  | 'governmentSupport';

export type SmartQuestionId =
  | 'paidConversionTiming'
  | 'paidConversionKpi'
  | 'pricingModelGap';

export type InvestigationLogEntry = {
  id: InvestigationLogEntryId;
  time: string;
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

export type InvestigationContext = {
  logEntries: InvestigationLogEntry[];
  liveSteps: LiveInvestigationStepId[];
  smartQuestions: SmartQuestion[];
  report: PmReportStats;
  hasDocument: boolean;
};
