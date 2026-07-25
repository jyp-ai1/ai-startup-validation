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
