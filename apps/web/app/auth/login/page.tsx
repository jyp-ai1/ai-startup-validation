import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { LoginPanel } from '@/features/auth/components/login-panel';
import {
  DEMO_PROJECT_DRAFT_COOKIE,
  parseDemoProjectDraftCookie,
} from '@/features/workflow-journey/lib/v2-demo-project-store';
import { getServerAuthUser } from '@/lib/auth/server-auth';
import { isSupabaseBrowserConfigured } from '@repo/db';

const ERROR_KEYS = {
  auth: 'loginError',
  cancelled: 'loginCancelled',
  session: 'loginSessionError',
  config: 'supabaseNotConfigured',
} as const;

const ERROR_REASON_KEYS = {
  auth: 'loginErrorReason',
  cancelled: 'loginCancelledReason',
  session: 'loginSessionErrorReason',
  config: 'supabaseNotConfiguredReason',
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  const tm = await getTranslations('meta');
  return {
    title: `${t('signIn')} | ${tm('titleSuffix')}`,
    robots: { index: false, follow: false },
  };
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next ?? '/workspace';
  const safeNext = next.startsWith('/') ? next : '/workspace';
  const user = await getServerAuthUser();

  if (user) {
    redirect(safeNext);
  }

  const errorParam = params.error;
  const errorKey =
    errorParam && errorParam in ERROR_KEYS
      ? ERROR_KEYS[errorParam as keyof typeof ERROR_KEYS]
      : errorParam
        ? 'loginError'
        : null;
  const errorReasonKey =
    errorParam && errorParam in ERROR_REASON_KEYS
      ? ERROR_REASON_KEYS[errorParam as keyof typeof ERROR_REASON_KEYS]
      : errorParam
        ? 'loginErrorReason'
        : null;

  const cookieStore = await cookies();
  const hasDemoDraft = Boolean(
    parseDemoProjectDraftCookie(cookieStore.get(DEMO_PROJECT_DRAFT_COOKIE)?.value),
  );

  return (
    <LoginPanel
      redirectTo={safeNext}
      errorKey={errorKey}
      errorReasonKey={errorReasonKey}
      supabaseReady={isSupabaseBrowserConfigured()}
      hasDemoDraft={hasDemoDraft}
    />
  );
}
