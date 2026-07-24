'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Sparkles } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { WorkflowGoalId } from '../types';
import { JourneyLayout } from './journey-layout';

const COMPOSE_MS = 2800;

type WorkflowComposeLoaderProps = {
  goalId: WorkflowGoalId;
};

export function WorkflowComposeLoader({ goalId }: WorkflowComposeLoaderProps) {
  const t = useTranslations('workflow.compose');
  const router = useRouter();
  const [phase, setPhase] = useState(0);

  const templateLabels = [
    t('templates.startup'),
    t('templates.pm'),
    t('templates.investor'),
  ];

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase(1), 600),
      window.setTimeout(() => setPhase(2), 1200),
      window.setTimeout(() => setPhase(3), 1800),
      window.setTimeout(() => {
        router.replace('/workflow');
      }, COMPOSE_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [router]);

  return (
    <JourneyLayout phase="workflow" width="default">
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-7 animate-pulse" aria-hidden />
        </span>
        <p className="mt-6 text-lg font-semibold text-foreground">{t('message')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('goalContext', { goal: t(`goals.${goalId}`) })}</p>

        <ul className="mt-8 w-full max-w-sm space-y-2 text-left" role="list" aria-live="polite">
          {templateLabels.map((label, index) => {
            const visible = phase > index;
            const done = phase > index + 1 || (phase === 3 && index === 2);
            return (
              <li
                key={label}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-500',
                  visible ? 'border-border/70 bg-card opacity-100' : 'border-transparent opacity-40',
                )}
              >
                {done ? (
                  <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                    ✓
                  </span>
                ) : visible ? (
                  <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                ) : (
                  <span className="size-4" aria-hidden />
                )}
                <span className={done ? 'text-muted-foreground line-through' : 'font-medium'}>{label}</span>
              </li>
            );
          })}
        </ul>

        {phase >= 3 ? (
          <p className="mt-6 text-sm font-medium text-emerald-700 dark:text-emerald-400">{t('done')}</p>
        ) : null}
      </div>
    </JourneyLayout>
  );
}
