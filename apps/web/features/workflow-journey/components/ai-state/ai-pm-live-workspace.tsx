'use client';

import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  buildAiPmWorkItems,
  estimateRemainingSeconds,
  getAiPmConversationMessageKey,
} from '../../lib/ai-pm-conversation';
import { AiPmConversation, AiPmMessage } from './ai-pm-conversation';
import { AiStateHero } from './ai-state-hero';

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
    return <Loader2 className="size-4 shrink-0 animate-spin text-amber-600" aria-hidden />;
  if (status === 'failed') return <X className="size-4 shrink-0 text-destructive" aria-hidden />;
  return <span className="size-4 shrink-0 rounded-full border border-muted-foreground/40" aria-hidden />;
}

export function AiPmLiveWorkspace({
  projectName,
  agentIndex,
  progressPercent,
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

  const priorMessages =
    agentIndex >= 1 && !failed
      ? [t('conversation.startResearch', { seconds: remaining + 4, project: projectName ?? '' })]
      : [];
  if (agentIndex >= 2 && !failed) priorMessages.push(t('conversation.afterMarket'));
  if (agentIndex >= 3 && !failed) priorMessages.push(t('conversation.profitability'));

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

        <AiStateHero
          context={{
            surface: 'pipeline',
            pipelineAgentIndex: agentIndex,
            pipelineProgress: progressPercent,
            pipelineFailed: failed,
          }}
        />

        <div>
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('officeLabel')}</span>
            {!failed ? (
              <span className="font-medium tabular-nums text-foreground">
                {t('remaining', { seconds: remaining })}
              </span>
            ) : null}
          </div>
          <ul className="space-y-3" role="list" aria-live="polite">
            {workItems.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'rounded-xl border border-border/60 px-4 py-3',
                  item.status === 'running' && 'border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20',
                )}
              >
                <div className="flex items-center gap-3">
                  <WorkStatusIcon status={item.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{tw(`${item.id}.label`)}</p>
                    <p className="text-xs text-muted-foreground">{tw(`${item.id}.${item.status}`)}</p>
                  </div>
                </div>
                {item.status === 'running' && item.progress != null ? (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-700"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        {failed ? (
          <div className="space-y-3">
            <AiPmMessage variant="system">{t('failedHint')}</AiPmMessage>
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
