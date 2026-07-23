'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

import type { ConsultantAction } from '../services/consultant-types';

type ConsultantActionsProps = {
  actions: ConsultantAction[];
  projectId: string;
};

export function ConsultantActions({ actions, projectId }: ConsultantActionsProps) {
  const t = useTranslations('aiConsultant');
  const { trackEvent } = useAnalytics();

  function handleClick(actionId: string) {
    trackEvent(
      actionId === 'generate_report'
        ? ANALYTICS_EVENTS.consultantReport
        : ANALYTICS_EVENTS.consultantAction,
      {
        project_id: projectId,
        action_id: actionId,
      },
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('actions.title')}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant}
            size="sm"
            className="h-9 text-xs"
            disabled={!action.enabled}
            asChild={action.enabled}
            onClick={action.enabled ? () => handleClick(action.id) : undefined}
          >
            {action.enabled ? (
              <Link href={action.href}>{t(action.labelKey as 'actions.aiResearch')}</Link>
            ) : (
              t(action.labelKey as 'actions.aiResearch')
            )}
          </Button>
        ))}
      </div>
    </section>
  );
}
