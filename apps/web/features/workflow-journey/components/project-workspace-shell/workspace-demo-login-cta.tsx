'use client';

import { useTranslations } from 'next-intl';

import { GoogleSignInButton } from '@/features/auth/components/google-sign-in-button';
import { persistDemoSessionForLogin } from '@/features/workflow-journey/lib/demo-guided-session';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceDemoLoginCtaProps = {
  className?: string;
};

export function WorkspaceDemoLoginCta({ className }: WorkspaceDemoLoginCtaProps) {
  const t = useTranslations('workflow.journey.workspaceShell.demo');

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/30 bg-primary/[0.04] px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
        {t('loginCtaLabel')}
      </p>
      <p className="mt-3 text-[15px] font-semibold leading-relaxed">{t('loginCtaTitle')}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t('loginCtaBody')}</p>
      <div className="mt-4 max-w-sm">
        <GoogleSignInButton
          redirectTo="/workspace?from=demo&promote=1"
          onBeforeSignIn={() => persistDemoSessionForLogin()}
          className="h-11 w-full rounded-xl"
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t('loginCtaHint')}</p>
    </section>
  );
}
