'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { AiPmConversation } from './ai-pm-conversation';

const INVESTIGATION_FEED = [
  'kmongDone',
  'soomgoRunning',
  'grantRunning',
  'pricingRunning',
] as const;

type AiPmInvestigationPreviewProps = {
  completedCount?: number;
  className?: string;
};

export function AiPmInvestigationPreview({
  completedCount = 0,
  className,
}: AiPmInvestigationPreviewProps) {
  const t = useTranslations('workflow.aiPm.investigation');

  const messages = [t('feedLead')];
  const visibleCount = Math.min(INVESTIGATION_FEED.length, Math.max(1, completedCount + 1));

  return (
    <div className={cn('rounded-2xl border border-primary/25 bg-primary/[0.04] p-5', className)}>
      <AiPmConversation messages={messages} />
      <ol className="mt-4 space-y-1" role="list">
        {INVESTIGATION_FEED.slice(0, visibleCount).map((key, index) => {
          const done = index < completedCount;
          const running = index === completedCount;
          return (
            <li key={key}>
              <p
                className={cn(
                  'text-sm',
                  done
                    ? 'font-medium text-emerald-700 dark:text-emerald-400'
                    : running
                      ? 'font-medium text-primary'
                      : 'text-muted-foreground',
                )}
              >
                {done ? '✓ ' : running ? '→ ' : '○ '}
                {t(`feed.${key}`)}
              </p>
              {index < visibleCount - 1 ? (
                <p className="py-1 text-center text-xs text-muted-foreground" aria-hidden>
                  ↓
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
