import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

type FeatureLinkCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
};

export function FeatureLinkCard({
  href,
  icon: Icon,
  title,
  description,
  className,
}: FeatureLinkCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:border-primary/25 hover:shadow-md',
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
