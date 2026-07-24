'use client';

import { useTranslations } from 'next-intl';

import { BETA_LABEL, BETA_VERSION } from '@/lib/site/beta-config';
import { Badge } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type BetaBadgeProps = {
  className?: string;
  showVersion?: boolean;
};

export function BetaBadge({ className, showVersion = true }: BetaBadgeProps) {
  const t = useTranslations('beta');

  return (
    <Badge
      variant="secondary"
      className={cn(
        'border border-amber-500/30 bg-amber-500/10 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300',
        className,
      )}
    >
      {t('badge')}
      {showVersion ? ` · ${BETA_VERSION}` : null}
    </Badge>
  );
}

export { BETA_LABEL, BETA_VERSION };
