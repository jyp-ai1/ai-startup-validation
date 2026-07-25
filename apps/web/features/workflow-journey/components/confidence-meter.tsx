'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@repo/ui/lib/utils';

type ConfidenceMeterProps = {
  value: number;
  target?: number;
  label?: string;
  className?: string;
  animate?: boolean;
};

const DURATION_MS = 900;

export function ConfidenceMeter({
  value,
  target,
  label,
  className,
  animate = true,
}: ConfidenceMeterProps) {
  const [display, setDisplay] = useState(animate ? 0 : value);
  const [pulse, setPulse] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      prevValue.current = value;
      return undefined;
    }

    const from = prevValue.current;
    const to = value;
    prevValue.current = value;

    if (from !== to) {
      setPulse(true);
      const pulseTimer = window.setTimeout(() => setPulse(false), 600);
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - (1 - progress) ** 3;
        setDisplay(Math.round(from + (to - from) * eased));
        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      };

      const frame = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(pulseTimer);
      };
    }

    setDisplay(to);
    return undefined;
  }, [animate, value]);

  return (
    <div className={cn('space-y-1.5', pulse && 'confidence-gain-pop', className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground transition-colors">{display}%</p>
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
