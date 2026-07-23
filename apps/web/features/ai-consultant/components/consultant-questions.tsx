'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

import type { ConsultantQuestion } from '../services/consultant-types';

type ConsultantQuestionsProps = {
  questions: ConsultantQuestion[];
  projectId: string;
};

export function ConsultantQuestions({ questions, projectId }: ConsultantQuestionsProps) {
  const t = useTranslations('aiConsultant');
  const { trackEvent } = useAnalytics();

  if (questions.length === 0) return null;

  function handleClick(questionId: string) {
    trackEvent(ANALYTICS_EVENTS.consultantQuestion, {
      project_id: projectId,
      question_id: questionId,
    });
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('questions.title')}
      </h3>
      <ul className="space-y-2">
        {questions.map((q) => (
          <li key={q.id}>
            <Link
              href={q.href}
              onClick={() => handleClick(q.id)}
              className="flex items-start gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-sm transition-colors hover:bg-primary/10"
            >
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium">{t(q.questionKey as 'questions.targetCustomer')}</p>
                {q.hintKey ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t(q.hintKey as 'questions.targetCustomerHint')}
                  </p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
