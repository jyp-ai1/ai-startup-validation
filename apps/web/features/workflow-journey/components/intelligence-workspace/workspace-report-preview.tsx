'use client';

import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

type WorkspaceReportPreviewProps = {
  projectName?: string;
  confidence: number;
  className?: string;
};

export function WorkspaceReportPreview({
  projectName,
  confidence,
  className,
}: WorkspaceReportPreviewProps) {
  const t = useTranslations('workflow.epic3.reportPreview');

  return (
    <section className={cn('rounded-2xl border border-dashed border-border/80 bg-muted/20 p-5', className)}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <FileText className="size-3.5" aria-hidden />
        {t('eyebrow')}
      </p>
      <p className="mt-2 font-semibold">{t('title')}</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t('project')}</dt>
          <dd className="font-medium">{projectName ?? t('unnamed')}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('confidence')}</dt>
          <dd className="font-bold tabular-nums">{confidence}%</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">{t('verdict')}</dt>
          <dd className="font-medium text-amber-700 dark:text-amber-400">{t('verdictValue')}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{t('hint')}</p>
    </section>
  );
}
