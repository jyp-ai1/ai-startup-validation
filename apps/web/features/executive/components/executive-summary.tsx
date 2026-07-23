'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

type ExecutiveSummaryProps = {
  summaryKeys: string[];
  projectId: string;
  projectType: string;
};

export function ExecutiveSummary({ summaryKeys, projectId, projectType }: ExecutiveSummaryProps) {
  const t = useTranslations('executive');
  const td = useTranslations('decision');
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.executiveSummaryView, {
      project_id: projectId,
      project_type: projectType,
    });
  }, [projectId, projectType, trackEvent]);

  return (
    <section className="space-y-4 border-b border-border/40 pb-10">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t('summary.eyebrow')}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{t('summary.title')}</h2>
      </div>
      <div className="max-w-3xl space-y-3">
        {summaryKeys.map((key) => {
          const isDecisionKey = key.startsWith('executive.');
          return (
            <p key={key} className="text-[17px] leading-relaxed text-foreground/90 md:text-lg">
              {isDecisionKey
                ? td(key as 'executive.insufficient1')
                : t(key as 'summary.line1')}
            </p>
          );
        })}
      </div>
    </section>
  );
}
