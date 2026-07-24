import Link from 'next/link';
import { Lightbulb } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

export type WorkspaceEmptyAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
};

type WorkspaceEmptyProps = {
  title: string;
  description: string;
  primaryAction?: WorkspaceEmptyAction;
  secondaryAction?: WorkspaceEmptyAction;
  recommendations?: string[];
  recommendationsLabel?: string;
  className?: string;
};

export function WorkspaceEmpty({
  title,
  description,
  primaryAction,
  secondaryAction,
  recommendations = [],
  recommendationsLabel = 'Recommended',
  className,
}: WorkspaceEmptyProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-border/80 bg-muted/15 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border/60">
        <Lightbulb className="size-5 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>

      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {primaryAction ? (
            <Button variant={primaryAction.variant ?? 'default'} asChild={!!primaryAction.href}>
              {primaryAction.href ? (
                <Link href={primaryAction.href}>{primaryAction.label}</Link>
              ) : (
                <button type="button" onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </button>
              )}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button variant={secondaryAction.variant ?? 'outline'} asChild={!!secondaryAction.href}>
              {secondaryAction.href ? (
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              ) : (
                <button type="button" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </button>
              )}
            </Button>
          ) : null}
        </div>
      )}

      {recommendations.length > 0 ? (
        <div className="mx-auto mt-8 max-w-md rounded-lg border border-border/60 bg-background/80 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {recommendationsLabel}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {recommendations.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
