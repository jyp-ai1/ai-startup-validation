'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { buildAiPmDailyBrief } from '../../lib/v2-ai-pm-daily-brief';
import { getLatestFounderMemo } from '../../lib/v2-ai-pm-notebook-store';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';

type V2AiPmDailyBriefProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
  stale?: boolean;
  readOnly?: boolean;
  onContinue: () => void;
  className?: string;
};

export function V2AiPmDailyBrief({
  evidence,
  reviewCount,
  hasIdea,
  investigationViewed,
  stale = false,
  readOnly = false,
  onContinue,
  className,
}: V2AiPmDailyBriefProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.aiPmBrief');

  const brief = buildAiPmDailyBrief({
    evidence,
    reviewCount,
    hasIdea,
    investigationViewed,
  });

  const founderMemo = reviewCount > 0 ? getLatestFounderMemo() : null;
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
          <p className="text-xs font-semibold text-primary">{t('role')}</p>
          <h2 className="mt-1 text-base font-semibold tracking-tight">
            {isFirstVisit ? t('greetingFirst') : t('greetingReturn')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {isFirstVisit ? t(`intro.${brief.todayFocusKey}`) : t('introReviewed')}
          </p>
        </div>
      </div>

      {founderMemo ? (
        <div className="mt-4 rounded-lg border border-border/40 bg-background/80 px-3 py-2.5 text-sm">
          <p className="text-muted-foreground">{t('founderMemoRecall')}</p>
          <p className="mt-1 font-medium">&ldquo;{founderMemo}&rdquo;</p>
          <p className="mt-2 text-xs text-muted-foreground">{t('founderMemoContinue')}</p>
        </div>
      ) : null}

      {stale ? (
        <p className="mt-4 text-sm font-medium text-amber-800 dark:text-amber-200">{t('staleHint')}</p>
      ) : null}

      {!isFirstVisit && brief.newFindings.length > 0 ? (
        <div className="mt-5 space-y-4">
          <div className="border-t border-border/40 pt-4">
            <ul className="space-y-2 text-sm">
              {brief.newFindings.map((item) => (
                <li key={item.id} className="flex gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                    ✔
                  </span>
                  <span>{t(`findings.${item.textKey}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-sm font-medium">{t(`todayFocus.${brief.todayFocusKey}`)}</p>
        </div>
      ) : null}

      {!readOnly ? (
        <Button type="button" className="mt-5 w-full rounded-lg sm:w-auto" onClick={onContinue}>
          {t('ctaContinue')}
        </Button>
      ) : null}
    </section>
  );
}
