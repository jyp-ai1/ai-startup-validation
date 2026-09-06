'use client';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';
import { useRef } from 'react';

import type { AiPmSupplementSnapshot } from '../../lib/business-understanding/ai-pm-supplement-presenter';

export type WorkspaceAiPmSupplementSurfaceProps = {
  snapshot: AiPmSupplementSnapshot;
  className?: string;
  readOnly?: boolean;
  onSubmit: (answer: string) => void;
  onCancel?: () => void;
};

export function WorkspaceAiPmSupplementSurface({
  snapshot,
  className,
  readOnly,
  onSubmit,
  onCancel,
}: WorkspaceAiPmSupplementSurfaceProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  return (
    <section
      data-testid="ai-pm-supplement-surface"
      className={cn(
        'space-y-5 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-4 py-4 sm:px-7 sm:py-5',
        className,
      )}
    >
      <h2
        data-testid="supplement-title"
        className="text-lg font-semibold text-foreground"
      >
        이 부분 보완하기
      </h2>

      <div data-testid="supplement-understood" className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          제가 이해한 것
        </p>
        <p className="text-sm leading-relaxed text-foreground">
          {snapshot.understoodSummary}
        </p>
      </div>

      <div data-testid="supplement-missing" className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          아직 모르는 것
        </p>
        <p className="text-sm leading-relaxed text-foreground">
          {snapshot.missingSummary}
        </p>
      </div>

      <div data-testid="supplement-why" className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          그래서 확인합니다
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {snapshot.whyNeeded}
        </p>
      </div>

      <div data-testid="supplement-question" className="space-y-2">
        <p
          data-testid="supplement-question-text"
          className="text-sm font-medium leading-relaxed text-foreground"
        >
          {snapshot.questionText}
        </p>
        <p
          data-testid="supplement-answer-guide"
          className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground"
        >
          {snapshot.answerGuideText}
        </p>
      </div>

      {!readOnly ? (
        <div className="space-y-3">
          <textarea
            ref={inputRef}
            data-testid="supplement-answer-input"
            className="min-h-[88px] w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm leading-relaxed"
            defaultValue=""
            placeholder="아시는 범위에서 편하게 적어주세요."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-xl"
              data-testid="supplement-submit-cta"
              onClick={() => {
                const answer = inputRef.current?.value.trim() ?? '';
                if (answer.length >= 2) onSubmit(answer);
              }}
            >
              답변 반영하기
            </Button>
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                data-testid="supplement-cancel-cta"
                onClick={onCancel}
              >
                검토로 돌아가기
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
