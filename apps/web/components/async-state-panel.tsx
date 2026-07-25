'use client';

import { Loader2, RefreshCw, WifiOff, Clock, Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type AsyncStateVariant = 'loading' | 'timeout' | 'network' | 'empty';

type AsyncStatePanelProps = {
  variant: AsyncStateVariant;
  onRetry?: () => void;
  className?: string;
  title?: string;
  description?: string;
};

const ICONS = {
  loading: Loader2,
  timeout: Clock,
  network: WifiOff,
  empty: Inbox,
} as const;

export function AsyncStatePanel({
  variant,
  onRetry,
  className,
  title,
  description,
}: AsyncStatePanelProps) {
  const t = useTranslations('errors.async');
  const Icon = ICONS[variant];
  const resolvedTitle = title ?? t(`${variant}.title`);
  const resolvedDescription = description ?? t(`${variant}.description`);

  return (
    <div
      role={variant === 'loading' ? 'status' : 'alert'}
      aria-live="polite"
      className={cn(
        'flex flex-col items-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border/60">
        <Icon
          className={cn('size-6 text-muted-foreground', variant === 'loading' && 'animate-spin')}
          aria-hidden
        />
      </div>
      <h3 className="text-base font-semibold">{resolvedTitle}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{resolvedDescription}</p>
      {onRetry && variant !== 'loading' ? (
        <Button type="button" variant="outline" size="sm" className="mt-5 gap-2" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden />
          {t('retry')}
        </Button>
      ) : null}
    </div>
  );
}
