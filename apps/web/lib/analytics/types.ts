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
  pageView: 'page_view',
  error: 'error',
  webVital: 'web_vital',
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
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}
