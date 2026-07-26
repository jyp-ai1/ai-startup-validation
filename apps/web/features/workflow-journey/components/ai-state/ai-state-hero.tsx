'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import {
  resolveAiStateHeroKeys,
  type AiStateContext,
} from '../../lib/ai-state-engine';

type AiStateHeroProps = {
  context: AiStateContext;
  className?: string;
  onPrimaryAction?: () => void;
};

export function AiStateHero({ context, className }: AiStateHeroProps) {
  const th = useTranslations('workflow.aiState.hero');
  const t = useTranslations('workflow.aiState');
  const keys = resolveAiStateHeroKeys(context);

  const founderAction = keys.founderActionParams
    ? t(keys.founderActionKey, keys.founderActionParams)
    : t(keys.founderActionKey);
  const aiActivity = keys.aiActivityParams
    ? t(keys.aiActivityKey, keys.aiActivityParams)
    : t(keys.aiActivityKey);
  const nextStep = keys.nextStepParams
    ? t(keys.nextStepKey, keys.nextStepParams)
    : t(keys.nextStepKey);

  return (
    <section
      className={cn(
        'rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-6',
        className,
      )}
      aria-label={th('label')}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-blue-300/40 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">
            {th('founderLabel')}
          </p>
          <p className="mt-2 text-base font-semibold leading-snug sm:text-lg">{founderAction}</p>
        </div>

        <div className="rounded-xl border border-amber-300/40 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-300">
            {th('aiLabel')}
          </p>
          <p className="mt-2 text-sm leading-relaxed sm:text-base">{aiActivity}</p>
          {keys.aiEtaSeconds ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {th('eta', { seconds: keys.aiEtaSeconds })}
            </p>
          ) : null}
          {keys.aiProgress != null && keys.aiProgress < 100 ? (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-700"
                  style={{ width: `${keys.aiProgress}%` }}
                  role="progressbar"
                  aria-valuenow={keys.aiProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-emerald-300/40 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-800 dark:text-emerald-300">
            {th('nextLabel')}
          </p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line sm:text-base">{nextStep}</p>
        </div>
      </div>
    </section>
  );
}
