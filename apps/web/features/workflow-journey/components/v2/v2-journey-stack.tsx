'use client';

import { cn } from '@repo/ui/lib/utils';

import { JOURNEY_WIDE_MAIN } from '../journey-focused-shell';

type V2JourneyStackProps = {
  /** Primary interaction — AI PM chat or form */
  main: React.ReactNode;
  /** Score / GO result card */
  result?: React.ReactNode;
  /** Expandable detail (market, competitor, …) */
  details?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  embedded?: boolean;
};

/**
 * V2 onboarding shell — single vertical column.
 * Header lives in JourneyLayout; no left/right rails.
 */
export function V2JourneyStack({
  main,
  result,
  details,
  footer,
  className,
  embedded = false,
}: V2JourneyStackProps) {
  const content = (
    <div className={cn('mx-auto flex w-full max-w-2xl flex-col gap-6', className)}>
      <section className="min-w-0">{main}</section>
      {result ? <section className="min-w-0">{result}</section> : null}
      {details ? <section className="min-w-0">{details}</section> : null}
      {footer ? <div className="sticky bottom-0 pt-2">{footer}</div> : null}
    </div>
  );

  if (embedded) return content;
  return <div className={JOURNEY_WIDE_MAIN}>{content}</div>;
}
