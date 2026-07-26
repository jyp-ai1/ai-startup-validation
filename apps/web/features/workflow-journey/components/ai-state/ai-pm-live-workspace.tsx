'use client';

import { Check, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  buildAiPmWorkItems,
  estimateRemainingSeconds,
  getAiPmConversationMessageKey,
} from '../../lib/ai-pm-conversation';
import { AiPmConversation } from './ai-pm-conversation';

type AiPmLiveWorkspaceProps = {
  projectName?: string;
  agentIndex: number;
  progressPercent: number;
  failed?: boolean;
  onRetry?: () => void;
  onSkipToToday?: () => void;
  className?: string;
};

function WorkStatusIcon({ status }: { status: 'done' | 'running' | 'waiting' | 'failed' }) {
  if (status === 'done') return <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />;
  if (status === 'running')
    return (
      <span className="size-2.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
    );
  if (status === 'failed') return <X className="size-4 shrink-0 text-destructive" aria-hidden />;
  return (
    <span className="size-2.5 shrink-0 rounded-full border border-muted-foreground/50" aria-hidden />
  );
}

export function AiPmLiveWorkspace({
  projectName,
  agentIndex,
  failed = false,
  onRetry,
  onSkipToToday,
  className,
}: AiPmLiveWorkspaceProps) {
  const t = useTranslations('workflow.aiPm');
  const tw = useTranslations('workflow.aiPm.work');
  const remaining = estimateRemainingSeconds(agentIndex);
  const workItems = buildAiPmWorkItems(agentIndex, failed);
  const messageKey = getAiPmConversationMessageKey(agentIndex, failed);
  const conversationMessage = t(messageKey, { seconds: remaining, project: projectName ?? '' });

  const priorMessages: string[] = [];
  if (agentIndex >= 1 && !failed) {
    priorMessages.push(t('conversation.confirmedIdea', { seconds: remaining + 6, project: projectName ?? '' }));
  }
  if (agentIndex >= 2 && !failed) priorMessages.push(t('conversation.afterMarket'));
  if (agentIndex >= 3 && !failed) priorMessages.push(t('conversation.competitorAnalysis'));

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/92 p-4 backdrop-blur-sm',
        className,
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-pm-live-title"
      aria-busy={!failed}
    >
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-border/70 bg-card p-6 shadow-xl sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="size-5 text-primary" aria-hidden />
          </span>
          <div>
            <p id="ai-pm-live-title" className="text-lg font-semibold">
              {t('title')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>

        <AiPmConversation messages={[...priorMessages.slice(-2), conversationMessage]} />

        <div>
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('officeLabel')}</span>
            {!failed ? (
              <span className="font-medium tabular-nums text-foreground">
                {t('remaining', { seconds: remaining })}
              </span>
            ) : null}
          </div>
          <ul className="space-y-2.5" role="list" aria-live="polite">
            {workItems.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm',
                  item.status === 'running' && 'border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20',
                  item.status === 'done' && 'text-muted-foreground',
                )}
              >
                <WorkStatusIcon status={item.status} />
                <span className={cn('font-medium', item.status === 'running' && 'text-foreground')}>
                  {tw(`${item.id}.${item.status}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {failed ? (
          <div className="space-y-3">
            <p className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {t('failedHint')}
            </p>
            <Button type="button" className="w-full rounded-xl" onClick={onRetry}>
              {t('retry')}
            </Button>
            {onSkipToToday ? (
              <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onSkipToToday}>
                {t('continueAnyway')}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">{t('stayOnPage')}</p>
        )}
      </div>
    </div>
  );
}
