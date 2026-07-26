'use client';

import { useState } from 'react';
import { ChevronDown, Check, Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { AiPmSurpriseFinding } from '../../lib/founder-research-trust';

type FounderAiPmDiscoveryPanelProps = {
  findings: AiPmSurpriseFinding[];
  className?: string;
};

function renderStars(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count));
}

export function FounderAiPmDiscoveryPanel({ findings, className }: FounderAiPmDiscoveryPanelProps) {
  const t = useTranslations('workflow.founderAiPm.researchTrust');

  if (findings.length === 0) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-amber-300/40 bg-gradient-to-br from-amber-500/[0.07] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('discovery.label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300">
        <Lightbulb className="size-3.5" aria-hidden />
        {t('discovery.label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('discovery.title')}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t('discovery.subtitle')}</p>

      <ul className="mt-4 space-y-3" role="list">
        {findings.map((finding) => (
          <li
            key={finding.id}
            className="rounded-xl border border-border/60 bg-background/90 px-4 py-3"
          >
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">{t('discovery.lead')}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{finding.body}</p>

            {finding.verification ? (
              <div className="mt-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-3">
                <p className="text-xs font-semibold text-muted-foreground">{t('verification.evidenceLabel')}</p>
                <ul className="mt-2 space-y-1" role="list">
                  {finding.verification.evidenceChecked.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm leading-relaxed">{finding.verification.conclusion}</p>
                <p className="mt-2 text-sm font-semibold tabular-nums text-primary">
                  {t('verification.trustLabel')} {finding.verification.trustPercent}%
                </p>
              </div>
            ) : (
              <p className="mt-2 text-amber-500" aria-hidden>
                {renderStars(finding.stars)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
