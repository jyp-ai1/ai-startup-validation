'use client';

import { useEffect, useState } from 'react';

import type { SiAiPmQuestion } from '@repo/types/domain/strategic-intelligence';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';

type SiAiPmBindSurfaceProps = {
  question: SiAiPmQuestion;
  projectId?: string;
  onAnswer: (answer: string) => void;
  className?: string;
};

export function SiAiPmBindSurface({
  question,
  projectId,
  onAnswer,
  className,
}: SiAiPmBindSurfaceProps) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.siAiPmQuestionAsked, {
      project_id: projectId,
      category: question.kind,
      screen: 'workspace',
    });
  }, [projectId, question.kind, question.questionText]);

  return (
    <section
      data-testid="si-ai-pm-bind-surface"
      data-si-ask-kind={question.kind}
      className={cn(
        'space-y-4 rounded-2xl border border-border/70 bg-card px-6 py-5 sm:px-7',
        className,
      )}
    >
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          AI PM · S.I.가 지정한 검증
        </p>
        <p className="text-xs text-muted-foreground">질문 엔진이 고른 다음 질문이 아닙니다.</p>
      </header>

      <p data-testid="si-ai-pm-question" className="text-[15px] font-medium leading-relaxed">
        {question.questionText}
      </p>
      <p data-testid="si-ai-pm-why" className="text-sm leading-relaxed text-muted-foreground">
        {question.whyAsking}
      </p>

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const answer = draft.trim();
          if (!answer) return;
          void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.siAiPmAnswerApplied, {
            project_id: projectId,
            category: question.kind,
            screen: 'workspace',
          });
          onAnswer(answer);
          setDraft('');
        }}
      >
        <textarea
          data-testid="si-ai-pm-answer"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="확인된 사실만 적어주세요. 계획이면 계획이라고 적으면 됩니다."
          className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <Button type="submit" data-testid="si-ai-pm-submit" disabled={!draft.trim()}>
          이 답으로 판단 갱신
        </Button>
      </form>
    </section>
  );
}
