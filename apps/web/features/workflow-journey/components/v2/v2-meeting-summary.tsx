'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, Check } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { V2ValidationEvidence } from '../../lib/v2-validation-store';
import { isEvidenceFieldFilled } from '../../lib/v2-validation-store';

type V2MeetingSummaryProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  className?: string;
};

type SummaryItem = {
  key: string;
  tone: 'ok' | 'warn';
};

export function V2MeetingSummary({ evidence, reviewCount, className }: V2MeetingSummaryProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.meetingSummary');

  if (reviewCount === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>{t('empty')}</p>
    );
  }

  const items: SummaryItem[] = [
    { key: 'market', tone: 'ok' },
    { key: 'competition', tone: 'ok' },
    ...(isEvidenceFieldFilled('customer', evidence)
      ? [{ key: 'customer', tone: 'ok' as const }]
      : []),
    {
      key: 'pricing',
      tone: isEvidenceFieldFilled('pricing', evidence) ? 'ok' : 'warn',
    },
  ];

  return (
    <section className={className}>
      <h2 className="text-base font-semibold tracking-tight">{t('title')}</h2>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2.5 text-sm">
            {item.tone === 'ok' ? (
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
            )}
            <span className="leading-relaxed">{t(`items.${item.key}.${item.tone}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
