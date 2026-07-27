'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { V2ValidationEvidence } from '../../lib/v2-validation-store';
import { isEvidenceFieldFilled } from '../../lib/v2-validation-store';

type V2ReviewBoardMinutesProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  className?: string;
};

type ConfirmedSection = 'market' | 'customer' | 'differentiation';

export function V2ReviewBoardMinutes({
  evidence,
  reviewCount,
  className,
}: V2ReviewBoardMinutesProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.reviewBoard');
  const tm = useTranslations('workflow.v2.strategyWorkspace.meetingBoard');
  const ts = useTranslations('workflow.v2.strategyWorkspace.ia.steps');

  if (reviewCount === 0) {
    return (
      <section id="review-board" className={cn('space-y-4', className)}>
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
        <div className="border-t border-border/40 pt-4">
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        </div>
      </section>
    );
  }

  const confirmedSections: ConfirmedSection[] = ['market', 'customer', 'differentiation'];

  const sectionBody = (key: ConfirmedSection): string => {
    if (key === 'market') return tm('marketDetail');
    if (key === 'customer') {
      return evidence.customer?.trim()
        ? tm('customerDetail')
        : tm('customerEmpty');
    }
    return evidence.mvp?.trim()
      ? tm('differentiationSummary', { value: evidence.mvp.trim() })
      : tm('differentiationEmpty');
  };

  const sectionSummary = (key: ConfirmedSection): string => {
    if (key === 'market') return tm('marketSummary');
    if (key === 'customer') {
      return evidence.customer?.trim()
        ? tm('customerSummary', { value: evidence.customer.trim() })
        : tm('customerEmpty');
    }
    return evidence.mvp?.trim()
      ? tm('differentiationSummary', { value: evidence.mvp.trim() })
      : tm('differentiationEmpty');
  };

  const unconfirmed: Array<'pricing' | 'competition'> = [];
  if (!isEvidenceFieldFilled('pricing', evidence)) unconfirmed.push('pricing');
  if (reviewCount > 0) unconfirmed.push('competition');

  return (
    <section id="review-board" className={cn('space-y-6', className)}>
      <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>

      <div className="space-y-6 border-t border-border/40 pt-4">
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('confirmedTitle')}
          </h3>
          {confirmedSections.map((key) => (
            <div key={key} className="space-y-2 border-b border-border/30 pb-4 last:border-0">
              <h4 className="text-sm font-medium">{tm(`sections.${key}`)}</h4>
              <p className="text-sm leading-relaxed text-muted-foreground">{sectionSummary(key)}</p>
              <p className="text-sm leading-relaxed">{sectionBody(key)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('evidenceTitle')}
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">{tm('sections.market')}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>{t('evidence.searchGrowth')}</li>
                <li>{t('evidence.grants')}</li>
                <li>{t('evidence.marketGrowth')}</li>
              </ul>
            </div>
          </div>
        </div>

        {unconfirmed.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('unconfirmedTitle')}
            </h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {unconfirmed.map((key) => (
                <li key={key} className="inline-flex items-center gap-1.5">
                  <span className="text-[10px]">○</span>
                  <span>{key === 'pricing' ? ts('bm') : ts(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-2 border-t border-border/30 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('recommendationTitle')}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{t('recommendationBody')}</p>
        </div>
      </div>
    </section>
  );
}
