'use client';

import { useEffect, useState } from 'react';

import { cn } from '@repo/ui/lib/utils';

type ConfidenceMeterProps = {
  value: number;
  target?: number;
  label?: string;
  className?: string;
  animate?: boolean;
};

export function ConfidenceMeter({
  value,
  target,
  label,
  className,
  animate = true,
}: ConfidenceMeterProps) {
  const [display, setDisplay] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return undefined;
    }
    const id = window.requestAnimationFrame(() => setDisplay(value));
    return () => cancelAnimationFrame(id);
  }, [animate, value]);

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{display}%</p>
        </div>
      ) : (
        <p className="text-2xl font-bold tabular-nums text-foreground">{display}%</p>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={display}
        aria-valuemin={0}
        aria-valuemax={target ?? 100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(100, display)}%` }}
        />
      </div>
      {target !== undefined ? (
        <p className="text-[10px] text-muted-foreground tabular-nums">목표 {target}%</p>
      ) : null}
    </div>
  );
}
