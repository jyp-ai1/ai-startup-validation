'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Kanban } from 'lucide-react';

import { trackProductEvent, PRODUCT_ANALYTICS_EVENTS } from '@/lib/analytics/product-analytics';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { useExecutionTasks } from '../hooks/use-execution-tasks';
import { getExecutionProgress, type ExecutionTaskKey } from '../lib/journey-execution-store';
import { JourneyLayout } from './journey-layout';

export function ExecutionWorkspaceView() {
  const t = useTranslations('workflow.execution');
  const { tasks, toggle, progress } = useExecutionTasks();

  const handleToggle = (key: ExecutionTaskKey) => {
    const next = toggle(key);
    const task = next.find((item) => item.key === key);
    if (task?.done) {
      const { percent } = getExecutionProgress(next);
      trackProductEvent(PRODUCT_ANALYTICS_EVENTS.executionTaskCompleted, {
        action_key: key,
        confidence: percent,
      });
    }
  };

  const coachBody = progress.nextKey
    ? t(`coachNext.${progress.nextKey}`)
    : t('coachComplete');

  return (
    <JourneyLayout phase="workspace" width="wide" variant="intelligence">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t('eyebrow')}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('subtitle')}</p>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="relative flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/5"
              role="img"
              aria-label={t('progressLabel', {
                done: progress.done,
                total: progress.total,
              })}
            >
              <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                {progress.percent}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('progressHint', { done: progress.done, total: progress.total })}
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Kanban className="size-3.5" aria-hidden />
            {t('boardLabel')}
          </p>
          <ul className="mt-4 space-y-3" role="list">
            {tasks.map((task, index) => (
              <li key={task.key}>
                <button
                  type="button"
                  onClick={() => handleToggle(task.key)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm',
                    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'motion-safe:animate-in motion-safe:fade-in',
                    task.done
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border/60 bg-muted/20 hover:border-primary/30 hover:bg-muted/40',
                  )}
                  style={{ animationDelay: `${index * 60}ms` }}
                  aria-pressed={task.done}
                >
                  {task.done ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span>
                    <span className="block font-medium">{t(`tasks.${task.key}.title`)}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {t(`tasks.${task.key}.desc`)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
          <p className="text-sm font-medium text-primary">{t('coachTitle')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{coachBody}</p>
          <Button asChild size="lg" className="mt-4 w-full rounded-xl sm:w-auto">
            <Link href="/workspace">{t('backWorkspace')}</Link>
          </Button>
        </div>
      </div>
    </JourneyLayout>
  );
}
