import { ANALYTICS_EVENTS, type AnalyticsEventName } from './types';

/** Map pathname patterns to screen-specific analytics events. */
export function resolveRouteEvent(pathname: string): AnalyticsEventName | null {
  if (pathname === '/dashboard' || pathname.endsWith('/dashboard')) {
    return ANALYTICS_EVENTS.dashboardView;
  }
  if (pathname.match(/\/projects\/[^/]+$/)) {
    return ANALYTICS_EVENTS.projectOpen;
  }
  if (pathname.includes('/government-grants') || pathname.includes('/grants')) {
    return ANALYTICS_EVENTS.governmentView;
  }
  if (pathname.includes('/validation/new') || pathname.includes('/validation/summary')) {
    return ANALYTICS_EVENTS.validationExecute;
  }
  return null;
}

export function screenFromPathname(pathname: string): string {
  return pathname.replace(/\/[a-f0-9-]{36}/gi, '/*') || '/';
}
