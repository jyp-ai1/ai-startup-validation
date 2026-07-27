'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { computeProjectHealth } from '../../lib/v2-project-health';
import type { NextActionKind } from '../../lib/v2-next-action-engine';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';
import { StarRating } from './v2-star-rating';

type V2ProjectHealthCardProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
  readOnly?: boolean;
  onAction: (kind: NextActionKind) => void;
  className?: string;
};

export function V2ProjectHealthCard({
  evidence,
  reviewCount,
  hasIdea,
  investigationViewed,
  readOnly = false,
  onAction,
  className,
}: V2ProjectHealthCardProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.projectHealth');
  const tn = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.nextAction');

  const health = computeProjectHealth({
    evidence,
    reviewCount,
    hasIdea,
    investigationViewed,
  });

  if (!health) return null;

  return (
    <section
      className={cn(
        'space-y-4 rounded-xl border border-border/50 bg-muted/10 p-5',
        className,
      )}
    >
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-base font-medium">{t(`status.${health.status}`)}</span>
          <StarRating stars={health.healthStars} className="text-base" />
        </div>
      </div>

      <div className="border-t border-border/40 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('confidenceLabel')}
        </p>
        <p className="mt-1 text-sm font-medium">{health.overallConfidence}%</p>
      </div>

      <div className="border-t border-border/40 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('biggestChangeLabel')}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t(`biggestChange.${health.biggestChangeKey}`)}
        </p>
      </div>

      <div className="border-t border-border/40 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('topActionLabel')}
        </p>
        <p className="mt-1 text-sm font-medium">{tn(`body.${health.topActionKind}`)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {tn('timeValue', { minutes: health.topActionMinutes })}
        </p>
        {!readOnly ? (
          <Button
            type="button"
            size="sm"
            className="mt-3 rounded-lg"
            onClick={() => onAction(health.topActionKind)}
          >
            {t('startCta')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
