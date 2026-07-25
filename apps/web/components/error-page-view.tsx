import Link from 'next/link';
import {
  AlertTriangle,
  FileQuestion,
  Loader2,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type ErrorVariant = '404' | '500' | 'offline' | 'timeout' | 'network';

type ErrorPageViewProps = {
  code: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  onRetry?: () => void;
  variant?: ErrorVariant;
};

const VARIANT_ICONS = {
  '404': FileQuestion,
  '500': AlertTriangle,
  offline: WifiOff,
  timeout: Loader2,
  network: WifiOff,
} as const;

export function ErrorPageView({
  code,
  title,
  description,
  actionLabel,
  actionHref = '/dashboard',
  secondaryLabel,
  secondaryHref,
  onRetry,
  variant = '500',
}: ErrorPageViewProps) {
  const Icon = VARIANT_ICONS[variant] ?? AlertTriangle;

  return (
    <div
      className={cn(
        'mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 text-center',
        'animate-in fade-in zoom-in-95 duration-500',
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-muted/50 ring-1 ring-border/60">
        <Icon className="size-7 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{code}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {onRetry ? (
          <Button type="button" onClick={onRetry} className="gap-2">
            <RefreshCw className="size-4" aria-hidden />
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
