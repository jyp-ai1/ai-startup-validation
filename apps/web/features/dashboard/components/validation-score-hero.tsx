'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import {
  getDecisionTone,
  getValidationHealth,
} from '@/features/dashboard/types';
import { VALIDATION_DECISION_LABELS } from '@/features/validation/utils/score-calculator';
import { Button, cn } from '@repo/ui';
import { formatRelativeTime } from '@repo/utils/date';

import { ProjectStatusBadge } from '@/features/projects/components/project-status-badge';

type ValidationScoreHeroProps = {
  stats: ProjectDashboardStats;
};

export function ValidationScoreHero({ stats }: ValidationScoreHeroProps) {
  const t = useTranslations();
  const { project, validationScore } = stats;
  const health = getValidationHealth(validationScore);
  const score = validationScore?.totalScore ?? null;
  const decision = validationScore?.decision ?? null;
  const updatedLabel = formatRelativeTime(new Date(project.updatedAt));

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.07] via-card to-card px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t('meta.appName')}
            </p>
            <div>
              <Link
                href={`/projects/${project.id}`}
                className="text-xl font-semibold tracking-tight hover:text-primary sm:text-2xl"
              >
                {project.title}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <ProjectStatusBadge status={project.status} />
                <span>{t('dashboard.updatedAgo', { time: updatedLabel })}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('dashboard.validationScore')}
              </p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
                  {score ?? '—'}
                </span>
                {score !== null ? (
                  <span className="pb-1 text-lg text-muted-foreground">{t('dashboard.points')}</span>
                ) : null}
              </div>
            </div>
            <div className="space-y-1">
              <p
                className={cn(
                  'text-2xl font-bold tracking-wide',
                  getDecisionTone(decision),
                )}
              >
                {decision ? VALIDATION_DECISION_LABELS[decision] : t('dashboard.notEvaluated')}
              </p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={cn(
                      'size-4',
                      index < health.stars
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/25',
                    )}
                  />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  {t(`dashboard.health.${health.label}`)}
                  {score !== null && score >= 70
                    ? ` · ${t('dashboard.topPercent', { percent: Math.min(99, Math.max(15, 100 - score)) })}`
                    : null}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {validationScore ? (
        <div className="grid gap-px bg-border/60 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: t('dashboard.categories.market'), value: validationScore.marketScore, max: 20 },
            { label: t('dashboard.categories.problem'), value: validationScore.problemScore, max: 20 },
            {
              label: t('dashboard.categories.competition'),
              value: validationScore.competitionScore,
              max: 15,
            },
            {
              label: t('dashboard.categories.businessModel'),
              value: validationScore.businessModelScore,
              max: 15,
            },
            {
              label: t('dashboard.categories.execution'),
              value: validationScore.executionScore,
              max: 15,
            },
            {
              label: t('dashboard.categories.founder'),
              value: validationScore.founderFitScore,
              max: 15,
            },
          ].map((item) => (
            <div key={item.label} className="bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {item.value}
                <span className="text-sm font-normal text-muted-foreground">/{item.max}</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round((item.value / item.max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-sm text-muted-foreground">{t('dashboard.noScoreHint')}</p>
          <Button asChild>
            <Link href={`/projects/${project.id}/validation/new`}>{t('dashboard.runValidation')}</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
