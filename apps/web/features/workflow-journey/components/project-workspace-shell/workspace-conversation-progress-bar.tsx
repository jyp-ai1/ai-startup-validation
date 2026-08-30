'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { WorkspaceSidebarSnapshot } from './workspace-shell-types';

type WorkspaceConversationProgressBarProps = {
  snapshot: WorkspaceSidebarSnapshot;
  className?: string;
};

/** P0-5 / P0-8 — mobile-friendly stage hint when sidebar is hidden. */
export function WorkspaceConversationProgressBar({
  snapshot,
  className,
}: WorkspaceConversationProgressBarProps) {
  const t = useTranslations('workflow.journey.workspaceShell');

  const stageLabel = t(`sidebar.stages.${snapshot.activeStageKey}` as 'sidebar.stages.aiPmLoop');

  return (
    <div
      data-testid="conversation-progress-bar"
      className={cn(
        'mb-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 lg:hidden',
        className,
      )}
    >
      <p className="text-xs font-medium text-primary">{t('sidebar.loopSummaryTitle')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t('conversationUx.progressHint')}</p>
      <p className="mt-2 text-xs font-medium text-foreground">{stageLabel}</p>
    </div>
  );
}
