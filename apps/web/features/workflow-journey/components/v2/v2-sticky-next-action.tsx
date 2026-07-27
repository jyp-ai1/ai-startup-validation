'use client';

import { useTranslations } from 'next-intl';
import { Clock } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { getNextActionMeta } from '../../lib/v2-next-action-meta';
import { getNextAction } from '../../lib/v2-next-action-engine';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';
import { StarRating } from './v2-star-rating';

type V2StickyNextActionProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
  readOnly?: boolean;
  onAction: () => void;
  className?: string;
};

export function V2StickyNextAction({
  evidence,
  reviewCount,
  hasIdea,
  investigationViewed,
  readOnly = false,
  onAction,
  className,
}: V2StickyNextActionProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.nextAction');

  const action = getNextAction({ evidence, reviewCount, hasIdea, investigationViewed });
  const meta = getNextActionMeta(action.kind);
  const why = t(`why.${action.kind}`);

  return (
    <div
      className={cn(
        'sticky bottom-0 z-20 -mx-2 border-t border-border/60 bg-background/95 px-2 py-3 backdrop-blur sm:-mx-4 sm:px-4',
        className,
      )}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('nextActionTitle')}
          </p>
          <p className="truncate text-sm font-medium">{t(`body.${action.kind}`)}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StarRating stars={meta.priorityStars} className="text-xs" />
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {t('timeValue', { minutes: meta.estimatedMinutes })}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{t('whyLabel')}</span> {why}
          </p>
        </div>
        {!readOnly ? (
          <Button type="button" size="sm" className="shrink-0 rounded-lg" onClick={onAction}>
            {t('ctaContinue')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
