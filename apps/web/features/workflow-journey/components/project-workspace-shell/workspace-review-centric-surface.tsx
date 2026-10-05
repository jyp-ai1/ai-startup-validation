'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@repo/ui/lib/utils';

import {
  PRODUCT_ANALYTICS_EVENTS,
  recordFunnelEvent,
} from '@/lib/analytics/product-analytics';

import type { ReviewCentricSurfaceSnapshot } from '../../lib/business-understanding/build-review-centric-surface';

export type WorkspaceReviewCentricSurfaceProps = {
  snapshot: ReviewCentricSurfaceSnapshot;
  className?: string;
};

const STATUS_MARK: Record<string, string> = {
  confirmed: '✓',
  in_progress: '●',
  unverified: '○',
};

export function WorkspaceReviewCentricSurface({
  snapshot,
  className,
}: WorkspaceReviewCentricSurfaceProps) {
  const previousJudgmentRef = useRef<string | null>(null);
  const [judgmentUpdated, setJudgmentUpdated] = useState(false);

  useEffect(() => {
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.reviewCentricSurfaceShown, {
      confirmed_count: snapshot.confirmedCount,
      open_count: snapshot.importantOpenCount,
    });
  }, [snapshot.confirmedCount, snapshot.importantOpenCount]);

  useEffect(() => {
    const previous = previousJudgmentRef.current;
    if (previous && previous !== snapshot.judgment) {
      setJudgmentUpdated(true);
    }
    previousJudgmentRef.current = snapshot.judgment;
  }, [snapshot.judgment]);

  return (
    <section
      data-testid="review-centric-surface"
      className={cn('space-y-5', className)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          지금까지 확인한 사업
        </p>
        <p
          data-testid="review-progress-label"
          className="text-xs font-medium text-muted-foreground"
        >
          {snapshot.progressLabel}
        </p>
      </div>

      <dl data-testid="review-structured-slots" className="space-y-2">
        {snapshot.slots.map((slot) => (
          <div key={slot.key} className="grid grid-cols-[4.5rem_1fr] gap-2 text-sm">
            <dt className="text-muted-foreground">{slot.label}</dt>
            <dd data-testid={`review-slot-${slot.key}`} className="text-foreground">
              {slot.value}
            </dd>
          </div>
        ))}
      </dl>

      <div data-testid="review-current-judgment">
        <p className="text-xs font-semibold text-muted-foreground">현재 판단</p>
        {judgmentUpdated ? (
          <p
            data-testid="review-judgment-updated"
            className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300"
          >
            방금 답변으로 판단이 바뀌었습니다.
          </p>
        ) : null}
        <p className="mt-1 text-sm leading-relaxed text-foreground">{snapshot.judgment}</p>
      </div>

      <div data-testid="review-key-uncertainty">
        <p className="text-xs font-semibold text-muted-foreground">가장 큰 불확실성</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{snapshot.uncertainty}</p>
      </div>

      <div data-testid="review-why-this-question">
        <p className="text-xs font-semibold text-muted-foreground">그래서 확인할 것</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{snapshot.whyThisQuestion}</p>
      </div>

      <ul data-testid="review-theme-progress" className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {snapshot.themes.map((theme) => (
          <li key={theme.id}>
            {STATUS_MARK[theme.status]} {theme.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
