'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { Button, Input } from '@repo/ui';

import { getBrowserFamily } from '@/lib/analytics/browser-context';
import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';
import { signInWithQaPasswordAction } from '@/features/auth/actions/auth-actions';

type QaPasswordLoginFormProps = {
  redirectTo: string;
};

export function QaPasswordLoginForm({ redirectTo }: QaPasswordLoginFormProps) {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState(signInWithQaPasswordAction, null);

  function handleSubmit() {
    const browser = getBrowserFamily();
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.loginStarted, {
      provider: 'qa_password',
      screen: '/auth/qa',
      status: 'attempt',
      browser,
    });
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.loginClicked, {
      provider: 'qa_password',
      screen: '/auth/qa',
      browser,
    });
    if (state?.error) {
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.loginFailed, {
        provider: 'qa_password',
        screen: '/auth/qa',
        error: state.error,
        browser,
      });
    }
  }

  return (
    <form
      data-testid="qa-login-form"
      className="mt-6 space-y-4"
      action={formAction}
      method="post"
      autoComplete="on"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="next" value={redirectTo} />
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-foreground">{t('qaLoginId')}</span>
        <Input
          name="loginId"
          data-testid="qa-login-id"
          autoComplete="username"
          required
          maxLength={16}
        />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-foreground">{t('qaPassword')}</span>
        <Input
          name="password"
          type="password"
          data-testid="qa-login-password"
          autoComplete="current-password"
          required
        />
      </label>
      {state?.error === 'config' ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          {t('supabaseNotConfigured')}
        </p>
      ) : null}
      {state?.error === 'invalid' ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" role="alert">
          {t('qaLoginError')}
        </p>
      ) : null}
      <Button type="submit" className="h-11 w-full rounded-xl" disabled={pending} aria-busy={pending}>
        {pending ? t('signingIn') : t('qaSubmit')}
      </Button>
    </form>
  );
}
