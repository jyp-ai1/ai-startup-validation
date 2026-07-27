'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { DocumentCitation, DocumentProfile } from '../../lib/v2-reason-chain-types';

type V2DocumentProfileSummaryProps = {
  profile: DocumentProfile;
  className?: string;
};

export function V2DocumentProfileSummary({ profile, className }: V2DocumentProfileSummaryProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.reasonChain.documentProfile');

  return (
    <div className={cn('rounded-xl border border-primary/25 bg-primary/[0.04] p-4', className)}>
      <p className="text-sm font-semibold">
        {t('analyzed', { name: profile.fileName })}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">{t('pages')}</dt>
          <dd className="font-medium">{profile.pageCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('strategies')}</dt>
          <dd className="font-medium">{profile.strategyCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('bm')}</dt>
          <dd className="font-medium">{profile.bmCount}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('kpi')}</dt>
          <dd className="font-medium">{profile.kpiCount}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">{t('risks')}</dt>
          <dd className="font-medium">{t('risksFound', { count: profile.riskCount })}</dd>
        </div>
      </dl>
    </div>
  );
}

type V2DocumentCitationBlockProps = {
  citations: DocumentCitation[];
  highlightId?: string;
  className?: string;
};

export function V2DocumentCitationBlock({
  citations,
  highlightId,
  className,
}: V2DocumentCitationBlockProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.reasonChain.citations');

  if (citations.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t('title')}
      </p>
      {citations.map((citation) => (
        <div
          key={citation.id}
          className={cn(
            'rounded-lg border border-border/40 bg-muted/10 px-4 py-3 text-sm',
            highlightId === citation.id && 'border-amber-500/40 bg-amber-500/5',
          )}
        >
          <p className="text-xs font-medium text-muted-foreground">
            {t('source')} · {t('page', { page: citation.page })} · {citation.section}
          </p>
          <p className="mt-1 text-xs italic text-foreground/80">"{citation.quote}"</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t(`findings.${citation.findingKey}`)}
          </p>
        </div>
      ))}
    </div>
  );
}
