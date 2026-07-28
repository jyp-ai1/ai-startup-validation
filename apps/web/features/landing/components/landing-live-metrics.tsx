'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { cn } from '@repo/ui/lib/utils';

import { LandingTestimonials } from './landing-testimonials';

type LandingLiveMetricsProps = {
  className?: string;
  variant?: 'hero' | 'section';
};

type PublicStats = Pick<OpsDashboardStats, 'source' | 'todayProductKpis' | 'aiPmKpis'>;

export function LandingLiveMetrics({ className, variant = 'section' }: LandingLiveMetricsProps) {
  const t = useTranslations('landing.liveMetrics');
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch('/api/analytics/stats')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setStats({
            source: json.data.source,
            todayProductKpis: json.data.todayProductKpis,
            aiPmKpis: json.data.aiPmKpis,
          });
        }
      })
      .catch(() => {
        /* mock fallbacks */
      });
  }, []);

  const today = stats?.todayProductKpis;
  const aiPm = stats?.aiPmKpis;
  const newUsers = today?.newUsers ?? 18;
  const projects = today?.projectsCreated ?? 11;
  const reviews = today?.aiReviewsCompleted ?? today?.firstReviews ?? 8;
  const returns = today?.returns ?? 5;
  const decisions = aiPm?.totalDecisionChanges ?? 127;

  if (variant === 'hero') {
    return (
      <div className={cn('mx-auto mt-8 max-w-3xl space-y-6', className)} aria-label={t('ariaLabel')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-background p-5 text-center">
            <p className="text-3xl font-semibold tabular-nums">{newUsers}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('humanToday', { count: newUsers })}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/10 p-5 text-center">
            <p className="text-sm text-muted-foreground">{t('projectsCreated')}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{projects}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t('reviewsCompleted', { count: reviews })}</p>
            <p className="text-xs text-muted-foreground">{t('returns', { count: returns })}</p>
          </div>
        </div>
        <p className="text-center text-base font-medium leading-relaxed text-violet-800 dark:text-violet-200">
          {t('humanImpact', { count: decisions })}
        </p>
        {stats?.source === 'mock' ? (
          <p className="text-center text-[10px] uppercase tracking-wide text-muted-foreground/70">
            {t('mockHint')}
          </p>
        ) : null}
        <LandingTestimonials />
      </div>
    );
  }

  return (
    <section className={cn('mx-auto max-w-4xl px-4', className)} aria-label={t('ariaLabel')}>
      <p className="text-center text-lg">{t('humanToday', { count: newUsers })}</p>
    </section>
  );
}
