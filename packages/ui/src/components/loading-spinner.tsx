import { Loader2 } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

type LoadingSpinnerProps = {
  className?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
} as const;

export function LoadingSpinner({
  className,
  label = 'Loading',
  size = 'md',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <Loader2
        className={cn('animate-spin text-muted-foreground', sizeClasses[size])}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
