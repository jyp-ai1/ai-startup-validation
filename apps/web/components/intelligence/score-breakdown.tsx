'use client';

import type { ValidationScore } from '@repo/types/validation';

import { SCORE_CATEGORIES } from '@/features/validation/utils/score-calculator';
import { cn } from '@repo/ui/lib/utils';

type ScoreBreakdownProps = {
  score: ValidationScore;
  className?: string;
};

export function ScoreBreakdown({ score, className }: ScoreBreakdownProps) {
  return (
    <div className={cn('space-y-5', className)}>
      {SCORE_CATEGORIES.map((category) => {
        const value = score[category.key];
        const percent = Math.round((value / category.maxScore) * 100);
        return (
          <div key={category.key}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{category.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {value}/{category.maxScore}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 motion-safe:animate-in"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
