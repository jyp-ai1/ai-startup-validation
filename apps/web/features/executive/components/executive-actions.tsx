'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

import type { ExecutiveActionItem } from '../services/executive-types';

type ExecutiveActionsProps = {
  actions: ExecutiveActionItem[];
  projectId: string;
};

export function ExecutiveActions({ actions, projectId }: ExecutiveActionsProps) {
  const t = useTranslations('executive');
  const td = useTranslations('decision');
  const { trackEvent } = useAnalytics();

  function handleClick(actionId: string) {
    trackEvent(ANALYTICS_EVENTS.actionClick, {
      project_id: projectId,
      action_id: actionId,
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{t('actions.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('actions.desc')}</p>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            onClick={() => handleClick(action.id)}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-border/50 bg-card px-5 py-4 transition-colors hover:border-primary/40"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              P{action.priority}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{td(action.labelKey as 'actions.voc10.label')}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {td(action.descriptionKey as 'actions.voc10.desc')}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{t(action.ownerKey as 'actions.owners.strategy')}</p>
              <p className="tabular-nums">{t('actions.eta', { days: action.etaDays })}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
