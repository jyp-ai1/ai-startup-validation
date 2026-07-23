'use client';

import { useTranslations } from 'next-intl';

import type { DecisionExplanation } from '@/features/decision';
import { CountUp } from '@/components/intelligence/count-up';

type DecisionConfidencePanelProps = {
  confidence: number;
  factors: DecisionExplanation['confidenceFactors'];
};

export function DecisionConfidencePanel({
  confidence,
  factors,
}: DecisionConfidencePanelProps) {
  const t = useTranslations('decision.confidence');

  const factorItems = [
    { label: t('evidenceVolume'), value: factors.evidenceVolume },
    { label: t('evidenceQuality'), value: factors.evidenceQuality },
    { label: t('recency'), value: factors.recency },
    { label: t('sourceTrust'), value: factors.sourceTrust },
  ];

  return (
    <section className="ll-consulting-card space-y-6 px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
        </div>
        <p className="text-5xl font-semibold tabular-nums tracking-tight">
          <CountUp value={confidence} />
          <span className="text-2xl text-muted-foreground">%</span>
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {factorItems.map((item) => (
          <div key={item.label} className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
            <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{item.value}%</p>
          </div>
        ))}
      </div>
    </section>
  );
}
