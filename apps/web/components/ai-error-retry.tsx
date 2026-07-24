'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type AiErrorRetryProps = {
  message: string;
  onRetry: () => void;
  disabled?: boolean;
  className?: string;
};

/** Unified AI failure UX — L3.3 EPIC 6 */
export function AiErrorRetry({ message, onRetry, disabled, className }: AiErrorRetryProps) {
  const t = useTranslations('common.aiError');

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      role="alert"
    >
      <p className="text-sm text-destructive">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={disabled} className="gap-2">
        <RefreshCw className="size-4" />
        {t('retry')}
      </Button>
    </div>
  );
}
