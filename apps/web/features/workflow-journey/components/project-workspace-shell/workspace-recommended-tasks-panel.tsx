'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

export type RecommendedTaskId =
  | 'customer_definition'
  | 'competitor_analysis'
  | 'bm_design'
  | 'market_validation';

const TASK_ORDER: RecommendedTaskId[] = [
  'customer_definition',
  'competitor_analysis',
  'bm_design',
  'market_validation',
];

type WorkspaceRecommendedTasksPanelProps = {
  primaryTaskId?: RecommendedTaskId;
  onSelectTask?: (taskId: RecommendedTaskId) => void;
  readOnly?: boolean;
  className?: string;
};

export function WorkspaceRecommendedTasksPanel({
  primaryTaskId = 'customer_definition',
  onSelectTask,
  readOnly = false,
  className,
}: WorkspaceRecommendedTasksPanelProps) {
  const t = useTranslations('workflow.journey.workspaceShell.recommendedTasks');

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
      <p className="mt-3 text-[15px] font-medium leading-relaxed">{t('lead')}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t('sub')}</p>

      <ol className="mt-5 space-y-2">
        {TASK_ORDER.map((taskId, index) => {
          const isPrimary = taskId === primaryTaskId;
          return (
            <li key={taskId}>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onSelectTask?.(taskId)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                  isPrimary
                    ? 'border-primary/40 bg-primary/[0.06]'
                    : 'border-border/60 hover:border-primary/30 hover:bg-muted/30',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                    isPrimary ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                  aria-hidden
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t(`tasks.${taskId}.title`)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(`tasks.${taskId}.hint`)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {onSelectTask ? (
        <Button
          type="button"
          className="mt-5 w-full rounded-xl sm:w-auto"
          disabled={readOnly}
          onClick={() => onSelectTask(primaryTaskId)}
        >
          {t('primaryCta', { task: t(`tasks.${primaryTaskId}.title`) })}
        </Button>
      ) : null}
    </section>
  );
}
