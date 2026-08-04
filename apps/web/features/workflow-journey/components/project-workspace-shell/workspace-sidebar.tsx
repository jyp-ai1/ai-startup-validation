'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type {
  WorkspaceMainView,
  WorkspaceNavNode,
  WorkspaceNavNodeId,
  WorkspaceSidebarSnapshot,
} from './workspace-shell-types';

type WorkspaceSidebarProps = {
  snapshot: WorkspaceSidebarSnapshot;
  mainView: WorkspaceMainView;
  activeNodeId: WorkspaceNavNodeId | null;
  onSelectNode: (nodeId: WorkspaceNavNodeId) => void;
  onSelectOverview: () => void;
  onSelectAiPm: () => void;
  className?: string;
};

function lifecycleSymbol(lifecycle: WorkspaceNavNode['lifecycle']): string {
  switch (lifecycle) {
    case 'completed':
      return '✔';
    case 'in_progress':
      return '●';
    default:
      return '○';
  }
}

export function WorkspaceSidebar({
  snapshot,
  mainView,
  activeNodeId,
  onSelectNode,
  onSelectOverview,
  onSelectAiPm,
  className,
}: WorkspaceSidebarProps) {
  const t = useTranslations('workflow.journey.workspaceShell');

  return (
    <aside
      className={cn(
        'flex w-full shrink-0 flex-col border-border/60 bg-background lg:w-[min(288px,24vw)] lg:min-w-[240px] lg:border-r',
        className,
      )}
      aria-label={t('sidebar.label')}
    >
      <div className="border-b border-border/60 p-5 lg:border-b-0 lg:p-7 lg:pb-5">
        <button
          type="button"
          onClick={onSelectOverview}
          className="w-full rounded-xl border border-border/60 bg-muted/30 p-4 text-left transition-colors hover:bg-muted/50"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('sidebar.summaryLabel')}
          </p>
          {snapshot.hideProgressMetrics ? (
            <>
              <p className="mt-3 text-base font-semibold leading-snug text-foreground">
                {t('sidebar.loopSummaryTitle')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('sidebar.loopSummaryHint')}
              </p>
              <p className="mt-3 text-xs font-medium text-primary">
                {t(`sidebar.stages.${snapshot.activeStageKey}`)}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
                {snapshot.businessScore ?? '—'}
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${snapshot.progressPercent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>{t('sidebar.progress', { percent: snapshot.progressPercent })}</span>
                <span>
                  {snapshot.completedTopics}/{snapshot.totalTopics}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-primary">
                {t(`sidebar.stages.${snapshot.activeStageKey}`)}
              </p>
              <p className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                <span className="font-semibold text-emerald-600">{t('sidebar.aiUpdated')}</span>
                {' · '}
                {snapshot.lastUpdatedMinutesAgo < 0
                  ? t('sidebar.lastUpdatedAnalyzing')
                  : snapshot.lastUpdatedMinutesAgo <= 0
                    ? t('sidebar.lastUpdatedJustNow')
                    : t('sidebar.lastUpdated', { minutes: snapshot.lastUpdatedMinutesAgo })}
              </p>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pt-0 lg:p-7 lg:pt-2">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('sidebar.progressLabel')}
        </p>

        {snapshot.stepFirstProgress && snapshot.journeySteps?.length ? (
          <ul className="mb-6 space-y-1" aria-label={t('sidebar.journeyLabel')}>
            {snapshot.journeySteps.map((step) => {
              const symbol = lifecycleSymbol(step.lifecycle);
              return (
                <li
                  key={step.id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm',
                    step.lifecycle === 'in_progress' && 'bg-primary/10 font-medium text-primary',
                    step.lifecycle === 'completed' && 'text-foreground',
                    step.lifecycle === 'waiting' && 'text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'w-4 shrink-0 text-center text-xs',
                      step.lifecycle === 'in_progress' && 'text-primary',
                      step.lifecycle === 'completed' && 'text-emerald-600',
                    )}
                    aria-hidden
                  >
                    {symbol}
                  </span>
                  {t(`journeyStep.${step.id}`)}
                </li>
              );
            })}
          </ul>
        ) : null}

        <button
          type="button"
          onClick={onSelectAiPm}
          className={cn(
            'mb-4 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
            mainView === 'ai-pm'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
        >
          <span className="w-4 shrink-0 text-center text-xs text-primary" aria-hidden>
            ●
          </span>
          {t('strip.label')}
        </button>

        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold">{t('sections.overview')}</p>
          <ul className="space-y-0.5">
            {snapshot.nodes.map((node) => {
              const active = mainView === 'overview' && activeNodeId === node.id;
              const symbol = lifecycleSymbol(node.lifecycle);
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => onSelectNode(node.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      active
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      node.lifecycle === 'completed' && !active && 'text-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'w-4 shrink-0 text-center text-xs',
                        node.lifecycle === 'in_progress' && 'text-primary',
                        node.lifecycle === 'completed' && 'text-emerald-600',
                      )}
                      aria-hidden
                    >
                      {symbol}
                    </span>
                    {t(`nodeStatus.${node.id}.${node.lifecycle}`)}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-4 opacity-45">
          {[t('sections.insights'), t('sections.recommendations'), t('sections.actions')].map(
            (label) => (
              <p key={label} className="text-sm font-semibold text-muted-foreground">
                {label}
              </p>
            ),
          )}
        </div>
      </div>
    </aside>
  );
}
