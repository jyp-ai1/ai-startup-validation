'use client';

import { useMemo } from 'react';
import { Gauge } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { computeValidationAccuracy } from '../../lib/founder-validation-accuracy';

type FounderValidationAccuracyPanelProps = {
  refreshKey?: number;
  className?: string;
};

export function FounderValidationAccuracyPanel({
  refreshKey = 0,
  className,
}: FounderValidationAccuracyPanelProps) {
  const t = useTranslations('workflow.founderAiPm.validationAccuracy');

  const brief = useMemo(() => computeValidationAccuracy(), [refreshKey]);

  const missing = brief.gaps.filter((gap) => !gap.filled);

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-amber-300/40 bg-gradient-to-br from-amber-50/50 to-background p-5 sm:p-6 dark:from-amber-950/20',
        className,
      )}
      aria-label={t('label')}
    >
      <div className="flex items-center gap-2">
        <Gauge className="size-4 text-amber-700 dark:text-amber-400" aria-hidden />
        <p className="text-sm font-semibold">{t('title')}</p>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('currentLabel')}
        </p>
        <p className="text-4xl font-bold tabular-nums">{brief.accuracy}%</p>
      </div>

      {missing.length > 0 ? (
        <div className="mt-5 rounded-xl border border-border/60 bg-background/80 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{t('insufficientLead')}</p>
          <ul className="mt-3 space-y-2" role="list">
            {missing.map((gap) => (
              <li key={gap.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground" aria-hidden>
                    □
                  </span>
                  {t(`fields.${gap.key}`)}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                  {t('boost', { value: gap.boost })}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{t('optionalHint')}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{t('sufficient')}</p>
      )}
    </section>
  );
}
