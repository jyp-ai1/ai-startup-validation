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
export async function recordFunnelEvent(
  event: ProductAnalyticsEvent,
  params?: ProductAnalyticsParams,
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: event,
        params: { ...params, funnel: true },
        timestamp: new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch {
    // non-blocking
  }
}
