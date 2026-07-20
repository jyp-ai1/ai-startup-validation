import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

export type WorkspaceBreadcrumbItem = {
  label: string;
  href?: string;
};

type WorkspaceBreadcrumbProps = {
  items: WorkspaceBreadcrumbItem[];
  className?: string;
};

export function WorkspaceBreadcrumb({ items, className }: WorkspaceBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex flex-wrap items-center gap-1 text-sm', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 ? (
              <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />
            ) : null}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
