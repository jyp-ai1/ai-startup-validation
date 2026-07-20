import Link from 'next/link';

import type { VOC } from '@repo/types/validation';
import { cn } from '@repo/ui/lib/utils';

import {
  VOCFrequencyBadge,
  VOCSeverityBadge,
  VOCSourceTypeBadge,
  VOCCustomerSegmentBadge,
} from './voc-badges';

type VOCCardProps = {
  projectId: string;
  entry: VOC;
};

export function VOCCard({ projectId, entry }: VOCCardProps) {
  const href = `/projects/${projectId}/voc/${entry.id}`;

  return (
    <Link
      href={href}
      className={cn(
        'll-consulting-card-hover group block',
        (entry.severity === 'CRITICAL' || entry.severity === 'HIGH') && 'border-rose-500/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[18px] font-semibold tracking-tight group-hover:text-primary">
            {entry.title}
          </p>
          <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {entry.painPoint}
          </p>
        </div>
        <VOCCustomerSegmentBadge segment={entry.customerSegment} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border/50 pt-5">
        <VOCSourceTypeBadge type={entry.sourceType} />
        <VOCFrequencyBadge frequency={entry.frequency} />
        <VOCSeverityBadge severity={entry.severity} />
      </div>
    </Link>
  );
}
