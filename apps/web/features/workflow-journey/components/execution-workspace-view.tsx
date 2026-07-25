'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Kanban } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { JourneyLayout } from './journey-layout';

const TASKS = [
  { key: 'market', done: true },
  { key: 'voc', done: false },
  { key: 'mvp', done: false },
  { key: 'pricing', done: false },
  { key: 'grant', done: false },
] as const;

export function ExecutionWorkspaceView() {
  const t = useTranslations('workflow.execution');

  return (
    <JourneyLayout phase="workspace" width="wide" variant="intelligence">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{t('eyebrow')}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('subtitle')}</p>
        </div>

        <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Kanban className="size-3.5" aria-hidden />
            {t('boardLabel')}
          </p>
          <ul className="mt-4 space-y-3" role="list">
            {TASKS.map((task, index) => (
              <li
                key={task.key}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm motion-safe:animate-in motion-safe:fade-in',
                  task.done
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border/60 bg-muted/20',
                )}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {task.done ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div>
                  <p className="font-medium">{t(`tasks.${task.key}.title`)}</p>
                  <p className="mt-0.5 text-muted-foreground">{t(`tasks.${task.key}.desc`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5">
          <p className="text-sm font-medium text-primary">{t('coachTitle')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('coachBody')}</p>
          <Button asChild size="lg" className="mt-4 w-full rounded-xl sm:w-auto">
            <Link href="/workspace">{t('backWorkspace')}</Link>
          </Button>
        </div>
      </div>
    </JourneyLayout>
  );
}
