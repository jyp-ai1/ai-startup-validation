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
  strategyGenerate: 'strategy_generate',
  businessPlanGenerate: 'business_plan_generate',
  reportGenerate: 'report_generate',
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
