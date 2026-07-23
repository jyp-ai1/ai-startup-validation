'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import {
  getLetterGrade,
  getTopPercent,
} from '@/features/dashboard/utils/readiness-calculator';
import { VALIDATION_DECISION_LABELS } from '@/features/validation/utils/score-calculator';
import { cn } from '@repo/ui/lib/utils';
import { useLocalizedFormatters } from '@/lib/i18n/use-localized-formatters';

import { CountUp } from './count-up';

type IntelligenceHeroProps = {
  stats: ProjectDashboardStats;
};

export function IntelligenceHero({ stats }: IntelligenceHeroProps) {
  const t = useTranslations();
  const { formatRelative } = useLocalizedFormatters();
  const { project, validationScore } = stats;
  const score = validationScore?.totalScore ?? null;
  const decision = validationScore?.decision ?? null;
  const grade = getLetterGrade(score);
  const topPercent = getTopPercent(score);

  return (
    <header className="relative overflow-hidden rounded-2xl bg-primary px-8 py-10 text-primary-foreground lg:px-12 lg:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="relative">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
              {t('meta.appName')} · {t('meta.appTagline')}
            </p>
            <div>
              <Link
                href={`/projects/${project.id}`}
                className="text-3xl font-semibold tracking-tight hover:text-primary-foreground/90 sm:text-[42px]"
              >
                {project.title}
              </Link>
              <p className="mt-2 text-[13px] text-primary-foreground/65">
                {t('dashboard.updatedAgo', {
                  time: formatRelative(new Date(project.updatedAt)),
                })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:flex sm:flex-wrap sm:items-end sm:gap-12">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-wider text-primary-foreground/65">
                {t('intelligence.startupReadiness')}
              </p>
              <div className="mt-2">
                {score !== null ? (
                  <CountUp
                    value={score}
                    className="text-5xl font-semibold tabular-nums leading-none tracking-tight sm:text-[64px]"
                  />
                ) : (
                  <span className="text-5xl font-semibold sm:text-[64px]">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[13px] font-medium uppercase tracking-wider text-primary-foreground/65">
                {t('intelligence.grade')}
              </p>
              <p className="mt-2 text-5xl font-semibold sm:text-[64px]">{grade}</p>
            </div>
            <div>
              <p className="text-[13px] font-medium uppercase tracking-wider text-primary-foreground/65">
                {t('intelligence.decision')}
              </p>
              <p
                className={cn(
                  'mt-2 text-2xl font-bold tracking-wide sm:text-3xl',
                  decision ? 'text-primary-foreground' : 'text-primary-foreground/60',
                )}
              >
                {decision ? VALIDATION_DECISION_LABELS[decision] : t('dashboard.notEvaluated')}
              </p>
            </div>
            {topPercent !== null ? (
              <div>
                <p className="text-[13px] font-medium uppercase tracking-wider text-primary-foreground/65">
                  {t('intelligence.ranking')}
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">
                  {t('dashboard.topPercent', { percent: topPercent })}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
