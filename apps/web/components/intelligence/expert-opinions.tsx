'use client';

import { useTranslations } from 'next-intl';

import type { ExpertOpinion } from '@/features/dashboard/utils/expert-opinions';
import { cn } from '@repo/ui/lib/utils';

type ExpertOpinionsProps = {
  opinions: ExpertOpinion[];
};

const SENTIMENT_STYLES = {
  positive: 'border-emerald-500/20 bg-emerald-500/[0.03]',
  neutral: 'border-border/50 bg-card',
  negative: 'border-rose-500/20 bg-rose-500/[0.03]',
} as const;

const ROLE_ACCENT = {
  vc: 'text-indigo-600 dark:text-indigo-400',
  pm: 'text-violet-600 dark:text-violet-400',
  cto: 'text-sky-600 dark:text-sky-400',
  marketing: 'text-amber-600 dark:text-amber-400',
} as const;

export function ExpertOpinions({ opinions }: ExpertOpinionsProps) {
  const t = useTranslations();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {opinions.map((item) => (
        <article
          key={item.role}
          className={cn(
            'rounded-2xl border p-10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
            SENTIMENT_STYLES[item.sentiment],
          )}
        >
          <p className={cn('text-[13px] font-semibold uppercase tracking-wider', ROLE_ACCENT[item.role])}>
            {t(item.labelKey)}
          </p>
          <p className="mt-4 text-base leading-relaxed text-foreground/90">{t(item.opinionKey)}</p>
        </article>
      ))}
    </div>
  );
}
