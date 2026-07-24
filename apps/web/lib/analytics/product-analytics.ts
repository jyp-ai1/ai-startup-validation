/**
 * Product Readiness analytics interface — Epic 4.
 * Wire to PostHog/GA4 via trackProductEvent(); adapter stays swappable.
 */

export const PRODUCT_ANALYTICS_EVENTS = {
  landingViewed: 'landing_viewed',
  goalSelected: 'goal_selected',
  workflowStarted: 'workflow_started',
  workspaceEntered: 'workspace_entered',
  decisionChanged: 'decision_changed',
  missingDataClicked: 'missing_data_clicked',
  coachActionClicked: 'coach_action_clicked',
  feedbackSubmitted: 'feedback_submitted',
} as const;

export type ProductAnalyticsEvent =
  (typeof PRODUCT_ANALYTICS_EVENTS)[keyof typeof PRODUCT_ANALYTICS_EVENTS];

export type ProductAnalyticsParams = {
  screen?: string;
  goal_id?: string;
  project_id?: string;
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
