'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

import type { NextBestAction } from '../services/strategy-workspace-types';

type NextBestActionPanelProps = {
  action: NextBestAction;
  projectId: string;
};

export function NextBestActionPanel({ action, projectId }: NextBestActionPanelProps) {
  const t = useTranslations('strategyWorkspace');
  const { trackEvent } = useAnalytics();

  function handleClick() {
    trackEvent(ANALYTICS_EVENTS.nextActionClick, {
      project_id: projectId,
      stage_id: action.stageId,
      action_id: action.id,
    });
  }

  return (
    <section className="rounded-xl border border-primary/30 bg-primary/5 p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
        {t('nextAction.eyebrow')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t(action.labelKey as 'nextAction.research.label')}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(action.descriptionKey as 'nextAction.research.desc')}
      </p>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" />
        {t('nextAction.estimated', { min: action.estimatedMinutes })}
      </p>
      <Button className="mt-5" asChild onClick={handleClick}>
        <Link href={action.href}>{t(action.ctaKey as 'nextAction.research.cta')}</Link>
      </Button>
    </section>
  );
}
