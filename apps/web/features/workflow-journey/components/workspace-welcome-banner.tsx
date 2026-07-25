'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type WorkspaceWelcomeBannerProps = {
  projectName: string;
  verdict: string;
  className?: string;
};

export function WorkspaceWelcomeBanner({
  projectName,
  verdict,
  className,
}: WorkspaceWelcomeBannerProps) {
  const t = useTranslations('workflow.workspace.welcome');

  return (
    <section
      className={cn(
        'rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
        <Sparkles className="size-3.5" aria-hidden />
        {t('eyebrow')}
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
        {t('title', { project: projectName })}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t('desc', { verdict })}
      </p>
    </section>
  );
}
