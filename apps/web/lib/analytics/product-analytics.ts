/**
 * Product journey funnel events — Epic 4.5 / Epic 5 analytics.
 */

export const PRODUCT_ANALYTICS_EVENTS = {
  landingViewed: 'landing_viewed',
  goalSelected: 'goal_selected',
  workflowStarted: 'workflow_started',
  workspaceEntered: 'workspace_entered',
  projectCreated: 'project_created',
  analysisStarted: 'analysis_started',
  decisionGenerated: 'decision_generated',
  decisionChanged: 'decision_changed',
  missingDataClicked: 'missing_data_clicked',
  coachActionClicked: 'coach_action_clicked',
  feedbackSubmitted: 'feedback_submitted',
  goReached: 'go_reached',
  goalIntakeRefined: 'goal_intake_refined',
  executionTaskCompleted: 'execution_task_completed',
  recommendedGoalSelected: 'recommended_goal_selected',
  holdPathViewed: 'hold_path_viewed',
  executionStarted: 'execution_started',
  agentPipelineStarted: 'agent_pipeline_started',
  agentPipelineSuccess: 'agent_pipeline_success',
  agentPipelineFailed: 'agent_pipeline_failed',
  agentPipelineRetry: 'agent_pipeline_retry',
  agentPipelineRecovery: 'agent_pipeline_recovery',
  analysisCompleted: 'analysis_completed',
  decisionViewed: 'decision_viewed',
  holdReasonViewed: 'hold_reason_viewed',
  nextActionStarted: 'next_action_started',
  taskCompleted: 'task_completed',
  dailyReturn: 'daily_return',
  weeklyReturn: 'weekly_return',
  projectStarted: 'project_started',
  demoStarted: 'demo_started',
  sampleSelected: 'sample_selected',
  investigationStarted: 'investigation_started',
  investigationFinished: 'investigation_finished',
  evidenceOpened: 'evidence_opened',
  smartQuestionAnswered: 'smart_question_answered',
  reviewCompleted: 'review_completed',
  strategyChanged: 'strategy_changed',
  myProjectStarted: 'my_project_started',
  loginStarted: 'login_started',
  loginFailed: 'login_failed',
  loginClicked: 'login_clicked',
  oauthRedirect: 'oauth_redirect',
  oauthSuccess: 'oauth_success',
  oauthFailed: 'oauth_failed',
  loginCancelled: 'login_cancelled',
  workspaceRestored: 'workspace_restored',
  returningUser: 'returning_user',
  draftPromoted: 'draft_promoted',
  workspaceRestoreValidated: 'workspace_restore_validated',
  projectRecoveryValidated: 'project_recovery_validated',
  demoRecoveryAvailable: 'demo_recovery_available',
  demoRecoveryValidated: 'demo_recovery_validated',
  firstReviewCompleted: 'first_review_completed',
  googleLoginSuccess: 'google_login_success',
  workspaceReturned: 'workspace_returned',
  morningReportView: 'morning_report_view',
  founderMemoWritten: 'founder_memo_written',
  artifactGenerated: 'artifact_generated',
  priceChanged: 'price_changed',
  targetChanged: 'target_changed',
  uspChanged: 'usp_changed',
  marketChanged: 'market_changed',
  bmChanged: 'bm_changed',
  blindSpotDetected: 'blind_spot_detected',
  clarityQuestionRaised: 'clarity_question_raised',
} as const;

export type ProductAnalyticsEvent =
  (typeof PRODUCT_ANALYTICS_EVENTS)[keyof typeof PRODUCT_ANALYTICS_EVENTS];

export type ProductAnalyticsParams = {
  screen?: string;
  goal_id?: string;
  project_id?: string;
  project_name?: string;
  verdict?: string;
  action_key?: string;
  sentiment?: 'up' | 'down';
  message?: string;
  confidence?: number;
  attempt?: number;
  error?: string;
  recovered?: boolean;
  category?: string;
  provider?: string;
  status?: string;
  session_id?: string;
  user_id?: string;
  blind_spot?: string;
  question_id?: string;
  browser?: string;
  duration_ms?: number;
  error_code?: string;
  promoted?: boolean;
  pass?: boolean;
  last_work?: string;
  last_stage?: string;
  checks_passed?: number;
  checks_total?: number;
  is_returning?: boolean;
};

export type ProductAnalyticsAdapter = {
  track: (event: ProductAnalyticsEvent, params?: ProductAnalyticsParams) => void;
};

let adapter: ProductAnalyticsAdapter | null = null;

export function registerProductAnalytics(next: ProductAnalyticsAdapter): void {
  adapter = next;
}

export function trackProductEvent(
  event: ProductAnalyticsEvent,
  params?: ProductAnalyticsParams,
): void {
  adapter?.track(event, params);
}

/** Always records to ops store — product funnel, not marketing cookies. */
const SESSION_KEY = 'll_analytics_session';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function recordFunnelEvent(
  event: ProductAnalyticsEvent,
  params?: ProductAnalyticsParams,
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const { getBrowserFamily } = await import('./browser-context');
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: event,
        params: {
          ...params,
          funnel: true,
          session_id: getOrCreateSessionId(),
          browser: params?.browser ?? getBrowserFamily(),
        },
        timestamp: new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch {
    // non-blocking
  }
}
