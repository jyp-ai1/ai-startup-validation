'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { FrameworkAnalysisResult } from '@/features/framework';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

import { FrameworkCard } from './framework-card';

type FrameworkSummaryAccordionProps = {
  analysis: FrameworkAnalysisResult;
  projectId: string;
  projectType: string;
};

export function FrameworkSummaryAccordion({
  analysis,
  projectId,
  projectType,
}: FrameworkSummaryAccordionProps) {
  const t = useTranslations('framework');
  const { trackEvent } = useAnalytics();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewTracked, setViewTracked] = useState(false);

  useEffect(() => {
    if (viewTracked) return;
    trackEvent(ANALYTICS_EVENTS.frameworkView, {
      project_id: projectId,
      project_type: projectType,
      screen: `/projects/${projectId}/decision`,
      status: analysis.selectedIds.join(','),
      duration: analysis.executionDurationMs,
    });
    setViewTracked(true);
  }, [analysis, projectId, projectType, trackEvent, viewTracked]);

  function handleToggle(frameworkId: string) {
    const next = expandedId === frameworkId ? null : frameworkId;
    setExpandedId(next);
    if (next) {
      trackEvent(ANALYTICS_EVENTS.frameworkDetail, {
        project_id: projectId,
        project_type: projectType,
        framework_name: frameworkId,
        screen: `/projects/${projectId}/decision`,
        duration: analysis.executionDurationMs,
      });
    }
  }

  if (analysis.frameworks.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('summaryTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('summaryDesc')}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('analyzedCount', { count: analysis.frameworks.length })}
          {' · '}
          {t('aggregateImpact', { impact: analysis.aggregateImpact })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {analysis.frameworks.map((fw) => (
          <span
            key={fw.id}
            className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-xs font-medium"
          >
            ✓ {t(fw.titleKey as 'names.swot')}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {analysis.frameworks.map((fw) => (
          <FrameworkCard
            key={fw.id}
            framework={fw}
            expanded={expandedId === fw.id}
            onToggle={() => handleToggle(fw.id)}
          />
        ))}
      </div>
    </section>
  );
}
