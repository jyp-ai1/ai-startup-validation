'use client';

import Link from 'next/link';
import { Clock, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ConsultantRecommendation } from '../services/consultant-types';

type ConsultantRecommendationsProps = {
  recommendations: ConsultantRecommendation[];
};

export function ConsultantRecommendations({ recommendations }: ConsultantRecommendationsProps) {
  const td = useTranslations('decision');
  const tc = useTranslations('aiConsultant');

  if (recommendations.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {tc('recommendations.title')}
      </h3>
      <ul className="space-y-2">
        {recommendations.map((rec) => (
          <li key={rec.id}>
            <Link
              href={rec.href}
              className="block rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-muted/40"
            >
              <div className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {rec.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">
                    {td(rec.labelKey as 'actions.voc10.label')}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5">
                      <TrendingUp className="size-3" />
                      {tc('recommendations.impact', { points: rec.scoreImpact })}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Clock className="size-3" />
                      {tc('recommendations.time', { days: rec.estimatedDays })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
