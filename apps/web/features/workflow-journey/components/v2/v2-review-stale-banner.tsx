'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { V2DirtyStateFlow } from './v2-dirty-state-flow';

type V2ReviewStaleBannerProps = {
  onReReview: () => void;
  changedFieldLabel?: string | null;
  readOnly?: boolean;
  className?: string;
};

export function V2ReviewStaleBanner({
  onReReview,
  changedFieldLabel = null,
  readOnly = false,
  className,
}: V2ReviewStaleBannerProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.dirtyState');

  return (
    <div
      className={cn(
        'space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300',
        className,
      )}
      role="status"
    >
      <V2DirtyStateFlow changedFieldLabel={changedFieldLabel} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="text-sm font-medium">{t('title')}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('body')}</p>
          </div>
        </div>
        {!readOnly ? (
          <Button type="button" size="sm" className="shrink-0 rounded-lg" onClick={onReReview}>
            {t('cta')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
