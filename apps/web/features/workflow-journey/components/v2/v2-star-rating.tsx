'use client';

import { cn } from '@repo/ui/lib/utils';

export function StarRating({
  stars,
  max = 5,
  className,
}: {
  stars: number;
  max?: number;
  className?: string;
}) {
  const filled = Math.max(0, Math.min(max, stars));
  return (
    <span className={cn('text-sm tracking-tight text-amber-500', className)} aria-label={`${filled}/${max}`}>
      {'★'.repeat(filled)}
      <span className="text-muted-foreground/30">{'★'.repeat(max - filled)}</span>
    </span>
  );
}
