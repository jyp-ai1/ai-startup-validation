'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { getBrowserFamily } from '@/lib/analytics/browser-context';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { isSupabaseBrowserConfigured, SupabaseAuthAdapter } from '@repo/db';
import { Button } from '@repo/ui';

type GoogleSignInButtonProps = {
  redirectTo?: string;
  className?: string;
  onBeforeSignIn?: () => void;
};

function maskEnv(value: string | undefined): string {
  if (!value) return '(missing)';
  if (value.length <= 12) return `${value.slice(0, 4)}…`;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function GoogleSignInButton({
  redirectTo = '/workspace',
  className,
  onBeforeSignIn,
}: GoogleSignInButtonProps) {
  const t = useTranslations('auth');
  const { trackEvent } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supabaseReady = isSupabaseBrowserConfigured();

  async function handleSignIn() {
    setErrorMessage(null);
    onBeforeSignIn?.();

    if (!supabaseReady) {
      const detail = 'Supabase public env missing (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)';
      console.error('[OAuth]', detail);
      setErrorMessage(detail);
      return;
    }

    setLoading(true);
    const browser = getBrowserFamily();

    console.log('[OAuth] Start', {
      supabaseUrl: maskEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
      anonKey: maskEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      redirectTo,
    });

    trackEvent(ANALYTICS_EVENTS.login, { provider: 'google', screen: '/auth/login', browser });
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.loginStarted, {
      provider: 'google',
      screen: '/auth/login',
      status: 'attempt',
      browser,
    });
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.loginClicked, {
      provider: 'google',
      screen: '/auth/login',
      browser,
    });

    try {
      const origin = window.location.origin;
      const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;

      console.log('[OAuth] redirectTo', callbackUrl);

      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.oauthRedirect, {
        provider: 'google',
        screen: '/auth/login',
        browser,
      });

      const auth = new SupabaseAuthAdapter();
      await auth.signInWithOAuth({ provider: 'google', redirectTo: callbackUrl });

      console.log('[OAuth] Redirect — signInWithOAuth completed (navigation pending)');
    } catch (error) {
      console.error('[OAuth] signInWithOAuth failed', error);

      const detail =
        error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
      setErrorMessage(detail);

      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.oauthFailed, {
        provider: 'google',
        screen: '/auth/login',
        error: detail,
        browser,
      });
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.loginFailed, {
        provider: 'google',
        screen: '/auth/login',
        error: detail,
        browser,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className={className}
        disabled={loading || !supabaseReady}
        aria-busy={loading}
        onClick={() => void handleSignIn()}
      >
        <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {loading ? t('signingIn') : t('continueWithGoogle')}
      </Button>
      {!supabaseReady ? (
        <p className="text-sm text-amber-700 dark:text-amber-300" role="status">
          {t('supabaseNotConfigured')}
        </p>
      ) : null}
      {errorMessage ? (
        <div className="space-y-1" role="alert">
          <p className="text-sm text-destructive">{t('loginNetworkError')}</p>
          <p className="break-all text-xs text-muted-foreground">{errorMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
