'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { MarketAnalysisResult } from '@/features/market-intelligence';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { cn } from '@repo/ui/lib/utils';

import { MarketSnapshotCards } from './market-snapshot-cards';

type MarketSnapshotPanelProps = {
  analysis: MarketAnalysisResult;
  projectId: string;
  projectType: string;
  variant?: 'dashboard' | 'decision';
};

export function MarketSnapshotPanel({
  analysis,
  projectId,
  projectType,
  variant = 'dashboard',
}: MarketSnapshotPanelProps) {
  const t = useTranslations('marketIntel');
  const { trackEvent } = useAnalytics();
  const [expanded, setExpanded] = useState(variant === 'decision');
  const [viewTracked, setViewTracked] = useState(false);
  const { result } = analysis;

  useEffect(() => {
    if (viewTracked) return;
    trackEvent(ANALYTICS_EVENTS.marketSnapshotView, {
      project_id: projectId,
      project_type: projectType,
      screen: variant === 'dashboard' ? '/dashboard' : `/projects/${projectId}/decision`,
      duration: analysis.executionDurationMs,
      status: String(result.marketScore),
    });
    setViewTracked(true);
  }, [analysis, projectId, projectType, result.marketScore, trackEvent, variant, viewTracked]);

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      trackEvent(ANALYTICS_EVENTS.marketDetailView, {
        project_id: projectId,
        project_type: projectType,
        screen: variant === 'dashboard' ? '/dashboard' : `/projects/${projectId}/decision`,
        duration: analysis.executionDurationMs,
      });
    }
  }

  return (
    <section className="ll-executive-panel space-y-6 px-8 py-8 md:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-ai">
            {t('eyebrow')}
          </p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-tight md:text-[22px]">
            {t('snapshotTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('snapshotDesc')}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('confidence', { value: result.confidence })}
            {' · '}
            {t('marketScore', { score: result.marketScore })}
          </p>
        </div>
        {variant === 'dashboard' ? (
          <button
            type="button"
            onClick={handleToggle}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            {expanded ? t('collapse') : t('expand')}
            <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
          </button>
        ) : null}
      </div>

      <MarketSnapshotCards result={result} compact={variant === 'dashboard' && !expanded} />

      {expanded ? (
        <div className="grid gap-6 border-t border-border/50 pt-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('opportunitiesTitle')}
            </h3>
            <ul className="mt-3 space-y-3">
              {result.opportunities.map((item) => (
                <li key={item.id} className="rounded-lg bg-muted/20 px-4 py-3">
                  <p className="text-sm font-medium">
                    {t(item.labelKey as 'opportunities.growth.label')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(item.textKey as 'opportunities.growth.text')}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t('threatsTitle')}
            </h3>
            <ul className="mt-3 space-y-3">
              {result.threats.map((item) => (
                <li key={item.id} className="rounded-lg bg-muted/20 px-4 py-3">
                  <p className="text-sm font-medium">
                    {t(item.labelKey as 'threats.competition.label')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(item.textKey as 'threats.competition.text')}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
