'use client';

import { Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ACHIEVEMENTS } from '@/features/project-intelligence/constants/achievements-mock';
import { cn } from '@repo/ui/lib/utils';

import { useAchievements } from '../../hooks/use-achievements';

export function JourneyAchievementsPanel() {
  const t = useTranslations('workflow.epic3.achievements');
  const badges = useAchievements();

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Trophy className="size-4 text-amber-500" aria-hidden />
        <h3 className="text-sm font-semibold">{t('title')}</h3>
      </div>
      <ul className="mt-4 space-y-3">
        {badges.map((badge) => {
          const pct = Math.min(100, Math.round((badge.progress / badge.target) * 100));
          return (
            <li key={badge.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className={cn(badge.unlocked && 'font-medium text-primary')}>
                  {t(`badges.${badge.labelKey}`)}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {badge.progress}/{badge.target}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 motion-safe:animate-in"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">{t('nextBadge')}</p>
    </section>
  );
}
