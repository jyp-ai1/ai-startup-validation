'use client';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type PriorAnswer = {
  issueId: string;
  label: string;
  answer: string;
};

type WorkspaceAnswerComposerProps = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  readOnly?: boolean;
  placeholder?: string;
  questionLabel?: string;
  questionIndex?: number;
  lastAnswer?: PriorAnswer | null;
  editingPrior?: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  showConfirmYes?: boolean;
  onConfirmYes?: () => void;
  showConfirmNo?: boolean;
  onConfirmNo?: () => void;
  contradiction?: { prior: string; next: string } | null;
  onKeepPrior?: () => void;
  onAcceptNew?: () => void;
  onAcceptBoth?: () => void;
  qualityHint?: string | null;
  className?: string;
};

export function WorkspaceAnswerComposer({
  draft,
  onDraftChange,
  onSubmit,
  readOnly = false,
  placeholder = '답변을 입력해 주세요.',
  questionLabel,
  questionIndex,
  lastAnswer = null,
  editingPrior = false,
  onStartEdit,
  onCancelEdit,
  showConfirmYes = false,
  onConfirmYes,
  showConfirmNo = false,
  onConfirmNo,
  contradiction = null,
  onKeepPrior,
  onAcceptNew,
  onAcceptBoth,
  qualityHint = null,
  className,
}: WorkspaceAnswerComposerProps) {
  const canSubmit = !readOnly && draft.trim().length >= 2;

  return (
    <div data-testid="answer-composer" className={cn('space-y-3', className)}>
      {questionIndex ? (
        <p data-testid="question-progress-label" className="text-xs font-medium text-muted-foreground">
          지금 확인할 것 · {questionIndex}번째 질문
        </p>
      ) : questionLabel ? (
        <p className="text-xs font-medium text-muted-foreground">{questionLabel}</p>
      ) : null}

      {lastAnswer && !editingPrior && !contradiction ? (
        <div
          data-testid="my-last-answer"
          className="rounded-xl border border-border/60 bg-muted/15 px-4 py-3"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">내 답변</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{lastAnswer.answer}</p>
          {onStartEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="mt-2 rounded-xl"
              data-testid="edit-prior-answer-cta"
              aria-label="이전 답변 수정"
              disabled={readOnly}
              onClick={onStartEdit}
            >
              수정하기
            </Button>
          ) : null}
        </div>
      ) : null}

      {editingPrior ? (
        <p className="text-sm font-medium">내 답변 수정</p>
      ) : null}

      {contradiction ? (
        <div
          data-testid="contradiction-confirm"
          className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] px-4 py-3"
        >
          <p className="text-sm font-medium">이전에 확인한 내용과 다른 정보가 있습니다.</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                이전 확인
              </dt>
              <dd className="mt-1 font-medium">{contradiction.prior}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                새 답변
              </dt>
              <dd className="mt-1 font-medium">{contradiction.next}</dd>
            </div>
          </dl>
          <p className="text-sm">어느 내용이 맞나요?</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-xl" disabled={readOnly} onClick={onKeepPrior}>
              이전 내용이 맞아요
            </Button>
            <Button type="button" className="rounded-xl" disabled={readOnly} onClick={onAcceptNew}>
              새 답변이 맞아요
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              data-testid="contradiction-accept-both"
              disabled={readOnly}
              onClick={onAcceptBoth}
            >
              둘 다 맞아요
            </Button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            data-testid="answer-input"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={4}
            readOnly={readOnly}
            placeholder={placeholder}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2 max-sm:min-h-[4.5rem]"
            aria-label="답변을 입력해 주세요."
          />
          {qualityHint ? (
            <p data-testid="answer-quality-hint" className="text-sm text-amber-800 dark:text-amber-200" role="status">
              {qualityHint}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:bg-gradient-to-t max-sm:from-background max-sm:via-background max-sm:to-background/80 max-sm:pt-2">
            <Button
              type="button"
              className="rounded-xl max-sm:w-full"
              data-testid="submit-answer-cta"
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              {editingPrior ? '수정 내용 반영' : '답변 제출'}
            </Button>
            {editingPrior && onCancelEdit ? (
              <Button type="button" variant="outline" className="rounded-xl" onClick={onCancelEdit}>
                취소
              </Button>
            ) : null}
            {showConfirmYes && onConfirmYes ? (
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                data-testid="confirm-yes-cta"
                disabled={readOnly}
                onClick={onConfirmYes}
              >
                네, 맞습니다
              </Button>
            ) : null}
            {showConfirmNo && onConfirmNo ? (
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                data-testid="confirm-no-cta"
                aria-label="아니요, 수정할게요"
                disabled={readOnly}
                onClick={onConfirmNo}
              >
                수정하기
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
