'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bot, Circle, Sparkles } from 'lucide-react';

import type { DashboardNextAction } from '@/features/dashboard/types';
import { WorkspacePanel } from '@/components/workspace/workspace-panel';
import { cn } from '@repo/ui/lib/utils';

type WorkspaceInsightPanelProps = {
  projectId: string;
  nextActions: DashboardNextAction[];
  highlights?: string[];
};

export function WorkspaceInsightPanel({
  projectId,
  nextActions,
  highlights = [],
}: WorkspaceInsightPanelProps) {
  const t = useTranslations();
  const openActions = nextActions.filter((action) => !action.completed).slice(0, 3);

  return (
    <WorkspacePanel
      title={t('workspace.insight.title')}
      description={t('workspace.insight.description')}
    >
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
        <Sparkles className="size-4 text-primary" />
        <span className="font-medium">{t('workspace.insight.aiLabel')}</span>
      </div>

      {highlights.length > 0 ? (
        <ul className="mb-4 space-y-2 text-sm">
          {highlights.map((item) => (
            <li key={item} className="flex gap-2 text-muted-foreground">
              <Circle className="mt-1 size-2 shrink-0 fill-amber-400 text-amber-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('workspace.insight.recommended')}
        </p>
        {openActions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('workspace.insight.allGood')}</p>
        ) : (
          <ol className="space-y-2">
            {openActions.map((action, index) => (
              <li key={action.id}>
                <Link
                  href={action.href}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-muted/30',
                  )}
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{t(action.labelKey)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Link
        href={`/projects/${projectId}/agent`}
        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <Bot className="size-4" />
        {t('workspace.insight.openAgent')}
      </Link>
    </WorkspacePanel>
  );
}
