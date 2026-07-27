'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type V2WorkspaceProjectHeaderProps = {
  projectName: string;
  lastReviewAt: Date | null;
  className?: string;
};

function formatReviewTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function V2WorkspaceProjectHeader({
  projectName,
  lastReviewAt,
  className,
}: V2WorkspaceProjectHeaderProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.header');

  return (
    <header className={cn('space-y-1', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t('projectLabel')}
      </p>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {projectName.trim() || t('defaultProject')}
      </h1>
      {lastReviewAt ? (
        <p className="text-xs text-muted-foreground">
          {t('lastReview', { time: formatReviewTime(lastReviewAt, 'ko-KR') })}
        </p>
      ) : null}
    </header>
  );
}
