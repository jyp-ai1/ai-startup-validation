'use client';

import { useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { buildAiPmInboxItems, type AiPmInboxItem } from '../../lib/founder-ai-pm-inbox';
import {
  loadReviewedInboxIds,
  markInboxItemReviewed,
} from '../../lib/founder-inbox-store';
import type { BusinessDeltaJudgment, GeneratedTodayAction } from '../../lib/founder-intelligence-engine';
import type { FounderEvidenceEntry } from '../../lib/founder-evidence-store';

type FounderAiPmInboxProps = {
  projectId: string;
  deltas: BusinessDeltaJudgment[];
  evidence: FounderEvidenceEntry[];
  todayActions: GeneratedTodayAction[];
  onReviewAction?: (actionId: string) => void;
  className?: string;
};

export function FounderAiPmInbox({
  projectId,
  deltas,
  evidence,
  todayActions,
  onReviewAction,
  className,
}: FounderAiPmInboxProps) {
  const t = useTranslations('workflow.founderAiPm.inbox');
  const [reviewed, setReviewed] = useState(() => loadReviewedInboxIds(projectId));

  const items = useMemo(
    () => buildAiPmInboxItems(deltas, evidence, todayActions),
    [deltas, evidence, todayActions],
  );

  const pending = items.filter((item) => !reviewed.has(item.id));

  const handleReview = (item: AiPmInboxItem) => {
    markInboxItemReviewed(projectId, item.id);
    setReviewed(new Set([...reviewed, item.id]));
    if (item.actionId && onReviewAction) {
      onReviewAction(item.actionId);
    }
  };

  if (items.length === 0) return null;

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <div className="flex items-center gap-2">
        <Inbox className="size-4 text-primary" aria-hidden />
        <p className="text-base font-semibold">{t('title')}</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('subtitle', { count: pending.length || items.length })}
      </p>

      <ol className="mt-5 space-y-4" role="list">
        {items.map((item, index) => {
          const isReviewed = reviewed.has(item.id);
          return (
            <li
              key={item.id}
              className={cn(
                'rounded-xl border px-4 py-4 transition-opacity',
                isReviewed
                  ? 'border-border/50 bg-muted/20 opacity-60'
                  : 'border-primary/20 bg-primary/[0.04]',
              )}
            >
              <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed">
                {t(`items.${item.headlineKey}`, item.headlineParams ?? {})}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                → {t(`items.${item.suggestionKey}`, item.suggestionParams ?? {})}
              </p>
              {!isReviewed ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-lg"
                  onClick={() => handleReview(item)}
                >
                  {t('reviewCta')}
                </Button>
              ) : (
                <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t('reviewed')}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
