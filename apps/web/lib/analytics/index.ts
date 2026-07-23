export { trackError, trackEvent, trackPage, trackTiming, getGaMeasurementId, isGa4Enabled } from './client';
export { getAnalyticsConsent, setAnalyticsConsent, hasAnalyticsConsent, hasConsentDecision } from './consent';
export { useAnalytics } from './use-analytics';
export { ANALYTICS_EVENTS } from './types';
export type { AnalyticsEventName, AnalyticsEventParams, AnalyticsConsent, OpsDashboardStats } from './types';
export { resolveRouteEvent, screenFromPathname } from './route-events';
