'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { cn } from '@repo/ui/lib/utils';

import { LANDING_CONTENT } from '../lib/landing-layout';

import { LandingTestimonials } from './landing-testimonials';

type LandingLiveMetricsProps = {
  className?: string;
  variant?: 'hero' | 'section';
};

type PublicStats = Pick<OpsDashboardStats, 'source' | 'landingSocialProof'>;

const MOCK_SOCIAL_PROOF = {
  todayReviewsStarted: 18,
  allTimeReviewsCompleted: 38,
} as const;

function SocialProofGrid({
  todayCount,
  allTimeCount,
  className,
}: {
  todayCount: number;
  allTimeCount: number;
  className?: string;
}) {
  const t = useTranslations('landing.liveMetrics');

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-background p-5 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{t('todayLabel')}</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{todayCount}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('todayReviewsStarted', { count: todayCount })}
        </p>
      </div>
      <div className="rounded-xl border border-border/60 bg-muted/10 p-5 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('allTimeLabel')}
        </p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{allTimeCount}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t('allTimeReviews', { count: allTimeCount })}
        </p>
      </div>
    </div>
  );
}

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
            landingSocialProof: json.data.landingSocialProof,
          });
        }
      })
      .catch(() => {
        /* mock fallbacks */
      });
  }, []);

  const socialProof = stats?.landingSocialProof ?? MOCK_SOCIAL_PROOF;
  const todayRaw = socialProof.todayReviewsStarted;
  const allTimeRaw = socialProof.allTimeReviewsCompleted;
  const allTimeCount = Math.max(allTimeRaw, todayRaw);
  const todayCount = Math.min(todayRaw, allTimeCount);

  if (variant === 'hero') {
    return (
      <div className={cn(LANDING_CONTENT, 'mt-8 space-y-6', className)} aria-label={t('ariaLabel')}>
        <SocialProofGrid todayCount={todayCount} allTimeCount={allTimeCount} />
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
    <section className={cn(LANDING_CONTENT, className)} aria-label={t('ariaLabel')}>
      <SocialProofGrid todayCount={todayCount} allTimeCount={allTimeCount} />
    </section>
  );
}
