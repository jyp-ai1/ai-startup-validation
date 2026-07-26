'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { AiPmConversation } from './ai-pm-conversation';

const INVESTIGATION_KEYS = [
  'market',
  'competitor',
  'pricing',
  'grant',
  'investment',
  'bm',
  'differentiation',
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

  const messages = [t('lead')];

  return (
    <div className={cn('rounded-2xl border border-primary/25 bg-primary/[0.04] p-5', className)}>
      <AiPmConversation messages={messages} />
      <ul className="mt-4 space-y-2" role="list">
        {INVESTIGATION_KEYS.map((key, index) => {
          const done = index < completedCount;
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'font-medium',
                  done ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
                )}
                aria-hidden
              >
                {done ? '✓' : '○'}
              </span>
              <span className={done ? 'text-foreground' : 'text-muted-foreground'}>
                {t(`items.${key}`)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
