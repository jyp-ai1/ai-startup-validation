'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { buildAiPmDailyBrief } from '../../lib/v2-ai-pm-daily-brief';
import { getNextAction } from '../../lib/v2-next-action-engine';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';

type V2AiPmDailyBriefProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
  readOnly?: boolean;
  onContinue: () => void;
  className?: string;
};

export function V2AiPmDailyBrief({
  evidence,
  reviewCount,
  hasIdea,
  investigationViewed,
  readOnly = false,
  onContinue,
  className,
}: V2AiPmDailyBriefProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.aiPmBrief');
  const tAction = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.nextAction');

  const brief = buildAiPmDailyBrief({
    evidence,
    reviewCount,
    hasIdea,
    investigationViewed,
  });

  if (!brief.showBrief) return null;

  const isFirstVisit = reviewCount === 0;

  return (
    <section
      id="ai-pm-brief"
      className={cn(
        'rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-background p-5 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t('role')}</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight">
            {isFirstVisit ? t('greetingFirst') : t('greetingReturn')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {isFirstVisit ? t(`intro.${brief.todayFocusKey}`) : t('introReviewed')}
          </p>
        </div>
      </div>

      {!isFirstVisit && brief.newFindings.length > 0 ? (
        <div className="mt-5 space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('newFindingsTitle')}
            </p>
            <ol className="mt-2 space-y-1.5 text-sm">
              {brief.newFindings.map((item, index) => (
                <li key={item.id} className="flex gap-2">
                  <span className="shrink-0 font-medium text-primary">
                    {t('itemMarker', { n: index + 1 })}
                  </span>
                  <span>{t(`findings.${item.textKey}`)}</span>
                </li>
              ))}
            </ol>
          </div>

          {brief.warnings.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                {t('warningsTitle')}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
                {brief.warnings.map((item) => (
                  <li key={item.id}>· {t(`warnings.${item.textKey}`)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-lg border border-border/40 bg-background/80 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t('todayFocusTitle')}
            </p>
            <p className="mt-1 text-sm font-medium">{t(`todayFocus.${brief.todayFocusKey}`)}</p>
          </div>
        </div>
      ) : null}

        {!readOnly ? (
          <Button type="button" className="mt-5 w-full rounded-lg sm:w-auto" onClick={onContinue}>
            {t('ctaContinue')}
          </Button>
        ) : null}

      {!isFirstVisit ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {tAction('whyLabel')} {tAction(`why.${getNextAction({ evidence, reviewCount, hasIdea, investigationViewed }).kind}`)}
        </p>
      ) : null}
    </section>
  );
}
