'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react';

import { toast } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { useJourneyAnalytics } from '../hooks/use-journey-analytics';

type AlphaFeedbackWidgetProps = {
  className?: string;
};

export function AlphaFeedbackWidget({ className }: AlphaFeedbackWidgetProps) {
  const t = useTranslations('workflow.feedback');
  const analytics = useJourneyAnalytics();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<'up' | 'down' | null>(null);

  const send = (type: 'up' | 'down') => {
    setSent(type);
    analytics.trackFeedbackSent(type);
    toast.success(t('thanks'));
    setOpen(false);
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2',
        'max-[430px]:bottom-3 max-[430px]:right-3',
        className,
      )}
    >
      {open ? (
        <div className="w-[min(280px,calc(100vw-2rem))] rounded-xl border border-border/70 bg-card p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t('prompt')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => send('up')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/70 py-2 text-sm hover:bg-muted"
              aria-label={t('up')}
            >
              <ThumbsUp className="size-4" aria-hidden />
              👍
            </button>
            <button
              type="button"
              onClick={() => send('down')}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/70 py-2 text-sm hover:bg-muted"
              aria-label={t('down')}
            >
              <ThumbsDown className="size-4" aria-hidden />
              👎
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={sent !== null}
        className={cn(
          'flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 text-sm font-medium shadow-md',
          'hover:bg-muted disabled:opacity-60',
        )}
      >
        <MessageSquare className="size-4" aria-hidden />
        {sent ? t('sent') : t('label')}
      </button>
    </div>
  );
}
