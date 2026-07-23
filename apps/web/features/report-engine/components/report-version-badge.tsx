'use client';

import { useTranslations } from 'next-intl';

import type { ReportVersion } from '../types/report-types';
import { cn } from '@repo/ui/lib/utils';

type ReportVersionBadgeProps = {
  version: ReportVersion;
  className?: string;
};

export function ReportVersionBadge({ version, className }: ReportVersionBadgeProps) {
  const t = useTranslations('reportEngine');

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider',
        version.stage === 'APPROVED' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700',
        version.stage === 'INTERNAL_REVIEW' && 'border-amber-500/40 bg-amber-500/10 text-amber-700',
        version.stage === 'DRAFT' && 'border-border/60 bg-muted/40 text-muted-foreground',
        className,
      )}
    >
      v{version.major}.{version.minor} · {t(version.labelKey as 'version.draft', version.labelParams)}
    </span>
  );
}
