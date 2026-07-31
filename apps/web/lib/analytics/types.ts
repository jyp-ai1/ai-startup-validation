/** Analytics event names tracked across the product. */
export const ANALYTICS_EVENTS = {
  dashboardView: 'dashboard_view',
  projectCreate: 'project_create',
  projectUpdate: 'project_update',
  projectOpen: 'project_open',
  researchCreate: 'research_create',
  researchComplete: 'research_complete',
  evidenceCreate: 'evidence_create',
  vocCreate: 'voc_create',
  competitorCreate: 'competitor_create',
  governmentView: 'government_view',
  validationExecute: 'validation_execute',
  decisionView: 'decision_view',
  decisionGenerate: 'decision_generate',
  decisionActionClick: 'decision_action_click',
  decisionExplainView: 'decision_explain_view',
  decisionDriverClick: 'decision_driver_click',
  missingDataClick: 'missing_data_click',
  frameworkExecute: 'framework_execute',
  frameworkView: 'framework_view',
  frameworkDetail: 'framework_detail',
  marketAnalysisExecute: 'market_analysis_execute',
  marketSnapshotView: 'market_snapshot_view',
  marketDetailView: 'market_detail_view',
  agentStart: 'agent_start',
  agentComplete: 'agent_complete',
  agentFailed: 'agent_failed',
  researchExecute: 'research_execute',
  researchReview: 'research_review',
  plannerStart: 'planner_start',
  plannerComplete: 'planner_complete',
  agentSchedule: 'agent_schedule',
  agentRetry: 'agent_retry',
  knowledgeMerge: 'knowledge_merge',
  dashboardOpen: 'dashboard_open',
  executiveSummaryView: 'executive_summary_view',
  riskView: 'risk_view',
  actionClick: 'action_click',
  exportClick: 'export_click',
  strategyGenerate: 'strategy_generate',
  businessPlanGenerate: 'business_plan_generate',
  reportGenerate: 'report_generate',
  reportPreview: 'report_preview',
  reportExport: 'report_export',
  reportTemplateChange: 'report_template_change',
  strategyStart: 'strategy_start',
  strategyContinue: 'strategy_continue',
  strategyComplete: 'strategy_complete',
  nextActionClick: 'next_action_click',
  timelineClick: 'timeline_click',
  consultantOpen: 'consultant_open',
  consultantAction: 'consultant_action',
  consultantQuestion: 'consultant_question',
  consultantPrompt: 'consultant_prompt',
  consultantReport: 'consultant_report',
  landingView: 'landing_view',
  landingStartClick: 'landing_start_click',
  homeNavigation: 'home_navigation',
  dashboardFirstOpen: 'dashboard_first_open',
  memorySave: 'memory_save',
  memoryRestore: 'memory_restore',
  contextBuild: 'context_build',
  dailyBriefView: 'daily_brief_view',
  workspaceSearch: 'workspace_search',
  workspaceCommand: 'workspace_command',
  workspaceFavoriteAdd: 'workspace_favorite_add',
  workspaceFavoriteRemove: 'workspace_favorite_remove',
  workspaceFavoriteOpen: 'workspace_favorite_open',
  workspaceProgressClick: 'workspace_progress_click',
  notificationView: 'notification_view',
  notificationClick: 'notification_click',
  notificationRead: 'notification_read',
  watchAdd: 'watch_add',
  watchRemove: 'watch_remove',
  dailyBriefOpen: 'daily_brief_open',
  ctaStart: 'cta_start',
  ctaDemo: 'cta_demo',
  pricingView: 'pricing_view',
  faqExpand: 'faq_expand',
  tourStart: 'tour_start',
  tourFinish: 'tour_finish',
  demoModeOpen: 'demo_mode_open',
  roadmapView: 'roadmap_view',
  builtforView: 'builtfor_view',
  signup: 'signup',
  login: 'login',
  wizardComplete: 'wizard_complete',
  demoEnter: 'demo_enter',
  workspaceSwitch: 'workspace_switch',
  workspaceOpen: 'workspace_open',
  workspaceContinue: 'workspace_continue',
  workspaceAction: 'workspace_action',
  workspaceTab: 'workspace_tab',
  onboardingStart: 'onboarding_start',
  questionAnswer: 'question_answer',
  onboardingComplete: 'onboarding_complete',
  researchPlanGenerate: 'research_plan_generate',
  languageChange: 'language_change',
  themeChange: 'theme_change',
  search: 'search',
  feedbackClick: 'feedback_click',
  funnelStep: 'funnel_step',
  pageView: 'page_view',
  error: 'error',
  webVital: 'web_vital',
} as const;

/** LaunchLens 2.0 journey funnel — see docs/EVENT_SCHEMA.md */
export const JOURNEY_ANALYTICS_EVENTS = {
  landingViewed: 'landing_viewed',
  goalSelected: 'goal_selected',
  workflowCreated: 'workflow_created',
  workspaceLoaded: 'workspace_loaded',
  coachClicked: 'coach_clicked',
  confidenceOpened: 'confidence_opened',
  whyOpened: 'why_opened',
  mockActionCompleted: 'mock_action_completed',
  feedbackSent: 'feedback_sent',
  composeFailed: 'compose_failed',
  composeRetried: 'compose_retried',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsEventParams = {
  project_id?: string;
  project_type?: string;
  language?: string;
  screen?: string;
  theme?: string;
  status?: string;
  duration?: number;
  error_message?: string;
  error_digest?: string;
  metric_name?: string;
  metric_value?: number;
  metric_rating?: string;
  query?: string;
  framework_name?: string;
  provider?: string;
  [key: string]: string | number | boolean | undefined;
};

export type AnalyticsEventPayload = {
  name: AnalyticsEventName | string;
  params?: AnalyticsEventParams;
  timestamp: string;
};

export type AnalyticsConsent = {
  analytics: boolean;
  updatedAt: string;
};

export type AiPmRecommendation = {
  priority: 'P0' | 'P1' | 'P2';
  todayProblem: string;
  whyImportant: string;
  recommendedExperiment: string;
  expectedLift: string;
  estimatedHours: string;
  risk: 'low' | 'medium' | 'high';
};

export type ProductOsBrief = {
  primaryKpiKey: string;
  primaryKpiLabel: string;
  currentValue: number;
  unit: '%' | 'count';
  biggestDropStep: string;
  dropPercent: number;
  rootCause: string;
  hypothesis: string;
  experiment: string;
  measureBy: string;
  nextKpiKey: string;
  deployVersion: string;
  recommendation: string;
  impact: {
    baselineValue: number;
    currentValue: number;
    delta: number;
    deltaLabel: string;
    expectedLift: number;
    experimentName: string;
    status: 'measuring' | 'adopted' | 'rolled_back' | 'active';
    adopt: boolean;
    rollback: boolean;
  } | null;
  aiPm: AiPmRecommendation;
  nextExperiment: string;
  productHealthScore: number;
};

export type OpsDashboardStats = {
  source: 'live' | 'mock';
  todayVisitors: number;
  weekVisitors: number;
  projectCreates: number;
  aiGenerations: number;
  reportGenerations: number;
  languageBreakdown: Record<string, number>;
  themeBreakdown: Record<string, number>;
  topScreens: { screen: string; count: number }[];
  recentErrors: { message: string; screen?: string; timestamp: string }[];
  webVitals: {
    lcp?: number;
    cls?: number;
    inp?: number;
  };
  gaConnected: boolean;
  totalEvents: number;
  activationFunnel?: {
    landing: number;
    signup: number;
    wizardComplete: number;
    researchExecute: number;
    decisionGenerate: number;
    reportGenerate: number;
  };
  /** Epic 4.5 product journey funnel — Goal → WOW */
  productJourneyFunnel?: {
    landing: number;
    goal: number;
    workflow: number;
    workspace: number;
    project: number;
    analysis: number;
    decision: number;
  };
  /** Activation Loop — Landing → First Action (PM primary funnel) */
  activationLoopFunnel?: {
    landing: number;
    goal: number;
    workflow: number;
    project: number;
    analysisCompleted: number;
    nextActionStarted: number;
  };
  activationLoopDropOff?: { step: string; from: number; to: number; dropPercent: number }[];
  activationLoopConversion?: number;
  todaySummary?: {
    goalSelected: number;
    workspaceEntered: number;
    goDecisions: number;
    feedbackSubmitted: number;
  };
  dropOffRates?: { step: string; from: number; to: number; dropPercent: number }[];
  recentFeedback?: {
    sentiment: 'up' | 'down';
    message?: string;
    screen?: string;
    timestamp: string;
  }[];
  analyticsProviders?: {
    ga: boolean;
    posthog: boolean;
    clarity: boolean;
  };
  closedBetaMetrics?: {
    retentionRate: number;
    completionRate: number;
    avgJourneyMinutes: number;
    goRatePercent: number;
    workflowCompletionRate: number;
    goalDistribution: Record<string, number>;
    holdCount: number;
    workspaceProgressAvg: number;
  };
  /** KPI-first metrics — CPO dashboard */
  productKpis?: {
    goalSelectionRate: number;
    activationRate: number;
    workflowCompletionRate: number;
    projectStartRate: number;
    decisionUnderstandingRate: number;
    executionStartRate: number;
    executionCompletionRate: number;
    goConversionRate: number;
    aiTrustRate: number;
    landingCtaRate: number;
    feedbackScore: number;
    recommendedGoalRate: number;
    analysisCompletionRate: number;
    firstActionRate: number;
  };
  /** Product OS v2 — KPI → impact → adopt/rollback → AI PM recommendation */
  productOs?: ProductOsBrief;
    productBrain?: {
    healthScore: number;
    experimentBacklog: number;
    rollbackCount: number;
    experiments?: {
      active: { id: string; name: string; kpiLabel: string; status: string }[];
      completed: { id: string; name: string; kpiLabel: string; status: string }[];
      failed: { id: string; name: string; kpiLabel: string; status: string }[];
    };
    kpiTrend?: { kpiLabel: string; days7: number; days30: number }[];
    aiPriorityQueue?: { priority: 'P0' | 'P1' | 'P2'; kpi: string; action: string }[];
    productIntelligence?: {
      successCount: number;
      failedCount: number;
      recommendedCount: number;
    };
    userIntelligence?: {
      topFrictionStep: string;
      topFrictionKpi: string;
      recommendedFix: string;
    };
    releaseIntelligence?: {
      version: string;
      kpiLabel: string;
      impactLabel: string;
      success: boolean;
      rollback: boolean;
    };
  };
  operationalMetrics?: {
    users: number;
    sessions: number;
    projects: number;
    activeWorkspaces: number;
    dropRatePercent: number;
    completionRate: number;
    goCount: number;
    feedbackCount: number;
    version: string;
  };
  /** Sprint 4.8 — Full Closed Alpha funnel (16 steps) */
  closedAlphaFunnel?: import('./closed-alpha-funnel').ClosedAlphaFunnelCounts;
  closedAlphaDropOff?: { step: string; from: number; to: number; dropPercent: number; percentOfLanding: number }[];
  /** Sprint 4.8 — Heatmap bars (% of landing) */
  funnelHeatmap?: { step: string; label: string; percent: number; count: number }[];
  /** Sprint 4.8 — D1/D3/D7/D14 retention */
  retentionRates?: { day: 'D1' | 'D3' | 'D7' | 'D14'; rate: number }[];
  /** Sprint 4.8 — Avg time between funnel steps (minutes) */
  timeAnalytics?: { from: string; to: string; avgMinutes: number }[];
  /** Sprint 4.8 — Top drop reasons */
  dropReasons?: { reason: string; percent: number }[];
  /** Sprint 4.8 — Questions where users stall */
  questionAnalytics?: { question: string; stuckPercent: number }[];
  /** Sprint 4.8 — AI PM working loop */
  aiPmWorking?: {
    avgLoopCount: number;
    investigationsToday: number;
    evidenceCreatedToday: number;
    founderEditsToday: number;
    aiReReviewsToday: number;
  };
  /** Sprint 4.7/4.8 — Today's product KPI for admin + landing */
  todayProductKpis?: {
    newUsers: number;
    projectsCreated: number;
    firstReviews: number;
    reReviews: number;
    artifacts: number;
    returns: number;
    aiReviewsCompleted?: number;
    /** Landing hero — founders who started first strategy review today */
    foundersStartingReview?: number;
  };
  /** Landing hero — today vs all-time social proof */
  landingSocialProof?: {
    todayReviewsStarted: number;
    allTimeReviewsCompleted: number;
  };
  /** Sprint 4.7 — Journey step analytics */
  journeyAnalytics?: {
    step: string;
    avgDwellSeconds: number;
    dropOffPercent: number;
    returnRate: number;
    completionRate: number;
  }[];
  /** Sprint 4.8 — AI PM operational KPI */
  aiPmKpis?: {
    investigationsToday: number;
    newEvidenceToday: number;
    totalDecisionChanges: number;
    priceChanges: number;
    targetChanges: number;
    uspChanges: number;
    marketChanges: number;
    bmChanges: number;
    artifactsToday: number;
    byCategory: Record<string, number>;
    suggestionAdoptionRate: number;
    competitorAddsToday: number;
    strategyChangesToday: number;
  };
  /** Sprint 5 Epic A — release validation chain */
  releaseReadiness?: {
    checks: { id: string; label: string; status: 'PASS' | 'PENDING' | 'FAIL' }[];
    overallPass: boolean;
  };
  /** Sprint 4.8 P0-10 — Blind spot aggregation */
  blindSpotAnalytics?: { spot: string; count: number; percent: number }[];
  aiPmInsightKpis?: {
    clarityQuestionsRaised: number;
    blindSpotsFound: number;
  };
  /** Sprint 4.8 P4 — Question detail metrics */
  questionAnalyticsDetail?: {
    questionId: string;
    avgMinutes: number;
    dropOffPercent: number;
    skipPercent: number;
    aiHelpClickPercent: number;
  }[];
  /** Sprint 5 Epic A — OAuth release blocker metrics */
  oauthAnalytics?: {
    successRate: number;
    failureRate: number;
    avgLoginSeconds: number;
    attempts: number;
    successes: number;
    failures: number;
    browserSuccessRates: { browser: string; rate: number; attempts: number }[];
    errorBreakdown: { code: string; count: number }[];
    qaReport: { browser: string; status: 'PASS' | 'PENDING' | 'FAIL' }[];
    /** P0-6 — daily smoke test summary for operators */
    recentLogins?: {
      successes: number;
      failures: number;
      successRate: number;
      avgLoginSeconds: number;
      recentErrors: { code: string; timestamp: string }[];
    };
  };
  /** Sprint 5.1.3 — release health with count/target */
  releaseHealth?: {
    target: number;
    overallPass: boolean;
    checks: {
      id: string;
      label: string;
      current: number;
      target: number;
      status: 'PASS' | 'PENDING' | 'FAIL';
    }[];
  };
  /** Sprint 5.1.3 — conversion funnel with step-over-step rates */
  conversionFunnel?: {
    step: string;
    label: string;
    count: number;
    rateFromPrevious: number;
    rateFromLanding: number;
  }[];
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify?: (id: string, properties?: Record<string, unknown>) => void;
    };
  }
}
