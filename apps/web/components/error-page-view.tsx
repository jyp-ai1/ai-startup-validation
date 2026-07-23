import Link from 'next/link';

import { Button } from '@repo/ui';

type ErrorPageViewProps = {
  code: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  onRetry?: () => void;
};

export function ErrorPageView({
  code,
  title,
  description,
  actionLabel,
  actionHref = '/dashboard',
  secondaryLabel,
  secondaryHref,
  onRetry,
}: ErrorPageViewProps) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{code}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {onRetry ? (
          <Button type="button" onClick={onRetry}>
            {actionLabel}
          </Button>
        ) : (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
        {secondaryLabel && secondaryHref ? (
          <Button variant="outline" asChild>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
