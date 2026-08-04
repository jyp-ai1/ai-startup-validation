'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { WorkspaceSharedUnderstanding } from '../../lib/business-understanding/build-shared-understanding';

type WorkspaceSharedUnderstandingPanelProps = {
  understanding: WorkspaceSharedUnderstanding;
  className?: string;
};

/** S8-1 — always-visible AI understanding contract (business · customer · problem). */
export function WorkspaceSharedUnderstandingPanel({
  understanding,
  className,
}: WorkspaceSharedUnderstandingPanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.sharedUnderstanding');

  const rows: Array<{ key: 'business' | 'customer' | 'problem'; value: string }> = [
    { key: 'business', value: understanding.business },
    { key: 'customer', value: understanding.customer },
    { key: 'problem', value: understanding.problem },
  ];

  return (
    <section
      data-testid="shared-understanding-panel"
      className={cn(
        'shrink-0 border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6 lg:px-8',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('label')}</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.key} className="min-w-0">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t(`fields.${row.key}`)}
            </dt>
            <dd className="mt-1 text-sm font-medium leading-snug text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
