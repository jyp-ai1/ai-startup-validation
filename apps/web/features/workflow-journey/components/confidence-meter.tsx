'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type ConfidenceMeterProps = {
  value: number;
  target?: number;
  label?: string;
  className?: string;
  animate?: boolean;
  gamified?: boolean;
};

const DURATION_MS = 900;

function confidenceTier(value: number): 'starter' | 'building' | 'strong' | 'goReady' {
  if (value >= 80) return 'goReady';
  if (value >= 65) return 'strong';
  if (value >= 45) return 'building';
  return 'starter';
}

export function ConfidenceMeter({
  value,
  target,
  label,
  className,
  animate = true,
  gamified = false,
}: ConfidenceMeterProps) {
  const t = useTranslations('workflow.intelligence.confidenceTier');
  const [display, setDisplay] = useState(animate ? 0 : value);
  const [pulse, setPulse] = useState(false);
  const prevValue = useRef(value);
  const tier = confidenceTier(display);
  const goal = target ?? 100;

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
      {gamified ? (
        <p className="text-xs font-semibold text-primary">{t(tier)}</p>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={display}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-label={label}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out',
            display >= 80 ? 'bg-emerald-500' : display >= 65 ? 'bg-primary' : 'bg-amber-500',
          )}
          style={{ width: `${Math.min(100, display)}%` }}
        />
      </div>
      {target !== undefined ? (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>{gamified ? t('toGo', { target }) : `목표 ${target}%`}</span>
          {gamified && display < target ? (
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              +{target - display}%
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
