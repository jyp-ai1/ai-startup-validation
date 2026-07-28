import { PRODUCT_ANALYTICS_EVENTS } from '@/lib/analytics/product-analytics';
import type { AnalyticsEventPayload } from '@/lib/analytics/types';
import { recordAnalyticsEvent } from '@/lib/analytics/server/ops-store';

export const OAUTH_ANALYTICS_EVENTS = {
  loginClicked: PRODUCT_ANALYTICS_EVENTS.loginClicked,
  oauthRedirect: PRODUCT_ANALYTICS_EVENTS.oauthRedirect,
  oauthSuccess: PRODUCT_ANALYTICS_EVENTS.oauthSuccess,
  oauthFailed: PRODUCT_ANALYTICS_EVENTS.oauthFailed,
  loginCancelled: PRODUCT_ANALYTICS_EVENTS.loginCancelled,
  workspaceRestored: PRODUCT_ANALYTICS_EVENTS.workspaceRestored,
  returningUser: PRODUCT_ANALYTICS_EVENTS.returningUser,
  draftPromoted: PRODUCT_ANALYTICS_EVENTS.draftPromoted,
} as const;

export type OAuthErrorCode =
  | 'redirect_mismatch'
  | 'session_expired'
  | 'provider_timeout'
  | 'network'
  | 'cookie_blocked'
  | 'popup_blocked'
  | 'access_denied'
  | 'config_missing'
  | 'code_missing'
  | 'exchange_failed'
  | 'unknown';

export function mapCallbackErrorToOAuthCode(
  errorCode: string,
  supabaseMessage?: string,
): OAuthErrorCode {
  if (errorCode === 'cancelled') return 'access_denied';
  if (errorCode === 'config') return 'config_missing';
  if (errorCode === 'session') {
    if (supabaseMessage?.toLowerCase().includes('expired')) return 'session_expired';
    return 'exchange_failed';
  }
  if (errorCode === 'auth') return 'unknown';
  return 'unknown';
}

export function recordOAuthAnalyticsEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  const payload: AnalyticsEventPayload = {
    name,
    params: { ...params, oauth: true },
    timestamp: new Date().toISOString(),
  };
  recordAnalyticsEvent(payload);
}

/** Server-side — OAuth callback success */
export function recordOAuthSuccess(params: {
  next: string;
  durationMs?: number;
  promoted?: boolean;
}): void {
  recordOAuthAnalyticsEvent(OAUTH_ANALYTICS_EVENTS.oauthSuccess, params);
  recordOAuthAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.googleLoginSuccess, {
    provider: 'google',
    screen: params.next,
    status: 'success',
    duration_ms: params.durationMs,
    promoted: params.promoted,
  });
}

/** Server-side — OAuth callback failure */
export function recordOAuthFailure(params: {
  errorCode: OAuthErrorCode;
  next: string;
  message?: string;
}): void {
  recordOAuthAnalyticsEvent(OAUTH_ANALYTICS_EVENTS.oauthFailed, {
    errorCode: params.errorCode,
    next: params.next,
    message: params.message,
  });
  recordOAuthAnalyticsEvent(PRODUCT_ANALYTICS_EVENTS.loginFailed, {
    provider: 'google',
    screen: '/auth/login',
    error: params.errorCode,
    message: params.message,
  });
  if (params.errorCode === 'access_denied') {
    recordOAuthAnalyticsEvent(OAUTH_ANALYTICS_EVENTS.loginCancelled, params);
  }
}
