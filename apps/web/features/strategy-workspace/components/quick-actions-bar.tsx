'use client';

import Link from 'next/link';
import { Bot, FileText, Play, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

type QuickActionsBarProps = {
  projectId: string;
};

export function QuickActionsBar({ projectId }: QuickActionsBarProps) {
  const t = useTranslations('strategyWorkspace');
  const { trackEvent } = useAnalytics();

  const actions = [
    {
      id: 'research',
      labelKey: 'quickActions.research',
      href: `/projects/${projectId}/research`,
      icon: Play,
    },
    {
      id: 'decision',
      labelKey: 'quickActions.decision',
      href: `/projects/${projectId}/decision`,
      icon: Scale,
    },
    {
      id: 'report',
      labelKey: 'quickActions.report',
      href: `/projects/${projectId}/executive-report`,
      icon: FileText,
    },
    {
      id: 'ai',
      labelKey: 'quickActions.runAi',
      href: `/projects/${projectId}/research`,
      icon: Bot,
    },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ id, labelKey, href, icon: Icon }) => (
        <Button
          key={id}
          variant="outline"
          size="sm"
          className="h-9"
          asChild
          onClick={() =>
            trackEvent(ANALYTICS_EVENTS.strategyContinue, {
              project_id: projectId,
              action: id,
            })
          }
        >
          <Link href={href}>
            <Icon className="size-3.5" />
            {t(labelKey)}
          </Link>
        </Button>
      ))}
    </div>
  );
}
