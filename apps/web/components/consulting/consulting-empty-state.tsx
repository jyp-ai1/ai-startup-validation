import Link from 'next/link';
import { FileSearch } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type ConsultingEmptyStateProps = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
};

export function ConsultingEmptyState({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  className,
}: ConsultingEmptyStateProps) {
  return (
    <div className={cn('ll-consulting-card border-dashed px-8 py-16 text-center', className)}>
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FileSearch className="size-7 opacity-80" />
      </div>
      <p className="mt-8 text-[18px] font-semibold tracking-tight">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button className="h-11 px-6" asChild>
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
        {secondaryLabel && secondaryHref ? (
          <Button variant="outline" className="h-11 px-6" asChild>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
