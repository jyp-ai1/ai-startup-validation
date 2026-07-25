'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';

import {
  PRODUCT_ANALYTICS_EVENTS,
  trackProductEvent,
} from '@/lib/analytics/product-analytics';
import { BETA_VERSION } from '@/lib/site/beta-config';
import { Button, Textarea, toast } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { useJourneyAnalytics } from '../hooks/use-journey-analytics';

type BetaFeedbackModalProps = {
  className?: string;
};

export function BetaFeedbackModal({ className }: BetaFeedbackModalProps) {
  const t = useTranslations('workflow.feedback');
  const te = useTranslations('workflow.epic4.feedback');
  const analytics = useJourneyAnalytics();
  const [open, setOpen] = useState(false);
  const [sentiment, setSentiment] = useState<'up' | 'down' | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (!sentiment) return;
    analytics.trackFeedbackSent(sentiment, message.trim() || undefined);
    trackProductEvent(PRODUCT_ANALYTICS_EVENTS.feedbackSubmitted, {
      sentiment,
      message: message.trim() || undefined,
    });
    setSent(true);
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
        <div
          className="w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-border/70 bg-card p-4 shadow-xl"
          role="dialog"
          aria-labelledby="feedback-title"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p id="feedback-title" className="text-sm font-semibold">{te('title')}</p>
              <p className="text-[11px] text-muted-foreground">{BETA_VERSION}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              aria-label={te('close')}
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{t('prompt')}</p>
          <div className="mb-3 flex gap-2">
            <button
              type="button"
              onClick={() => setSentiment('up')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-sm transition-colors',
                sentiment === 'up' ? 'border-primary bg-primary/10' : 'border-border/70 hover:bg-muted',
              )}
            >
              <ThumbsUp className="size-4" aria-hidden />
              {t('up')}
            </button>
            <button
              type="button"
              onClick={() => setSentiment('down')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-sm transition-colors',
                sentiment === 'down' ? 'border-primary bg-primary/10' : 'border-border/70 hover:bg-muted',
              )}
            >
              <ThumbsDown className="size-4" aria-hidden />
              {t('down')}
            </button>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={te('placeholder')}
            rows={3}
            className="mb-3 rounded-xl text-sm"
          />
          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={!sentiment}
            onClick={submit}
          >
            <Send className="size-4" aria-hidden />
            {te('submit')}
          </Button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={sent}
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
