'use client';

import { useTranslations } from 'next-intl';

import type { OpportunityItem } from '@/features/decision';

type ExecutiveOpportunitiesProps = {
  opportunities: OpportunityItem[];
};

const PRIORITY: Record<string, number> = {
  MARKET: 1,
  GROWTH: 2,
  GRANT: 3,
  TECHNOLOGY: 4,
  AI: 5,
};

export function ExecutiveOpportunities({ opportunities }: ExecutiveOpportunitiesProps) {
  const t = useTranslations('decision');
  const te = useTranslations('executive');

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{te('opportunities.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{te('opportunities.desc')}</p>
      </div>
      <div className="space-y-3">
        {opportunities.map((opp, index) => (
          <div
            key={opp.id}
            className="flex gap-4 rounded-xl border border-border/50 bg-card px-5 py-4"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{t(opp.titleKey as 'opportunities.market.title')}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {te('opportunities.priority', { value: PRIORITY[opp.category] ?? index + 1 })}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(opp.descriptionKey as 'opportunities.market.desc')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
