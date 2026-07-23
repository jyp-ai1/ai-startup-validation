'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

import type { WatchAiSummary } from '../types';

type AiDailyBriefingProps = {
  projectId: string;
  summary: WatchAiSummary;
};

export function AiDailyBriefing({ projectId, summary }: AiDailyBriefingProps) {
  const t = useTranslations('watch');
  const { trackEvent } = useAnalytics();

  return (
    <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">{t('brief.title')}</h3>
      </div>
      <p className="mt-2 text-base font-medium tracking-tight">{t(summary.headlineKey)}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {summary.bullets.map((bullet) => (
          <li key={bullet.id}>
            • {t(bullet.labelKey, { count: bullet.count ?? 0 })}
          </li>
        ))}
      </ul>
      <Button
        className="mt-4"
        size="sm"
        asChild
        onClick={() =>
          trackEvent(ANALYTICS_EVENTS.dailyBriefOpen, {
            project_id: projectId,
            screen: 'watch_center',
          })
        }
      >
        <Link href={summary.actionHref}>{t(summary.actionKey)}</Link>
      </Button>
    </section>
  );
}
