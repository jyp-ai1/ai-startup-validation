'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

import { submitInterviewAnswerAction } from '../actions/interview-actions';
import type { InterviewQuestionId } from '../types/interview-state';

type InterviewQuestionViewProps = {
  projectId: string;
  questionId: InterviewQuestionId;
  stepLabel: string;
  questionText: string;
  initialAnswer?: string;
  onComplete?: () => void;
  onAnswered?: () => void;
};

export function InterviewQuestionView({
  projectId,
  questionId,
  stepLabel,
  questionText,
  initialAnswer = '',
  onComplete,
  onAnswered,
}: InterviewQuestionViewProps) {
  const t = useTranslations('interview.question');
  const [answer, setAnswer] = useState(initialAnswer);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitInterviewAnswerAction(projectId, questionId, answer);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.complete) {
        onComplete?.();
      } else {
        onAnswered?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl space-y-8">
      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">{stepLabel}</p>
        <h1 className="text-2xl font-semibold leading-snug tracking-tight">{questionText}</h1>
      </div>

      <div className="space-y-3">
        <label htmlFor="interview-answer" className="sr-only">
          {t('answerLabel')}
        </label>
        <textarea
          id="interview-answer"
          name="answer"
          rows={5}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder={t('answerPlaceholder')}
          disabled={pending}
          className="w-full resize-none rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2"
        />
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending} className="h-12 rounded-xl px-8">
        {pending ? t('saving') : t('nextCta')}
      </Button>
    </form>
  );
}
