import Link from 'next/link';
import { Bot, FileSearch } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type ConsultingEmptyStateProps = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  aiHint?: string;
  aiGuideLabel?: string;
  className?: string;
};

export function ConsultingEmptyState({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  aiHint,
  aiGuideLabel = 'AI Guide',
  className,
}: ConsultingEmptyStateProps) {
  return (
    <div className={cn('ll-consulting-card border-dashed px-8 py-16 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500', className)}>
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary motion-safe:transition-transform motion-safe:hover:scale-105">
        <FileSearch className="size-7 opacity-80" />
      </div>
      <p className="mt-8 text-[18px] font-semibold tracking-tight">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {aiHint ? (
        <div className="mx-auto mt-6 max-w-lg rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Bot className="size-3.5" />
            {aiGuideLabel}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{aiHint}</p>
        </div>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button className="h-11 px-6 motion-safe:transition-transform motion-safe:active:scale-[0.98]" asChild>
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
        {secondaryLabel && secondaryHref ? (
          <Button variant="outline" className="h-11 px-6 motion-safe:transition-transform motion-safe:active:scale-[0.98]" asChild>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
