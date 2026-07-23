'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

import type { DailyBriefViewModel } from '../types';

type DailyBriefPanelProps = {
  projectId: string;
  brief: DailyBriefViewModel;
};

export function DailyBriefPanel({ projectId, brief }: DailyBriefPanelProps) {
  const t = useTranslations('brief');
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.dailyBriefView, {
      project_id: projectId,
      task_count: brief.tasks.length,
      screen: '/dashboard',
    });
  }, [brief.tasks.length, projectId, trackEvent]);

  return (
    <section className="ll-consulting-card space-y-5 border-primary/20 bg-primary/[0.03]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
          {t('eyebrow')}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">{t(brief.greetingKey as 'greeting.morning')}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {t(brief.summaryKey as 'summary.default', brief.summaryParams)}
        </p>
      </div>

      {brief.highlights.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {brief.highlights.map((item) => (
            <li
              key={item.id}
              className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground"
            >
              {t(item.labelKey as 'highlights.start')}
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('tasksTitle')}
        </p>
        <ol className="space-y-3">
          {brief.tasks.map((task, index) => (
            <li key={task.id}>
              <Link
                href={task.href}
                className="flex items-center gap-4 rounded-xl border border-border/60 bg-background px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="flex-1 font-medium">{t(task.labelKey as 'tasks.research')}</span>
                <Button variant="ghost" size="sm" className="shrink-0 text-primary" tabIndex={-1}>
                  {t('start')}
                </Button>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" />
        {t('aiSummary')}
      </div>
    </section>
  );
}
