'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import {
  loadFounderMicroAnswers,
  saveFounderMicroAnswer,
  type FounderMicroAnswers,
} from '../../lib/founder-micro-interaction-store';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

type FounderAiPmProactiveQuestionProps = {
  className?: string;
};

export function FounderAiPmProactiveQuestion({ className }: FounderAiPmProactiveQuestionProps) {
  const t = useTranslations('workflow.founderAiPm.proactiveQuestion');
  const [answers, setAnswers] = useState(loadFounderMicroAnswers);
  const [saved, setSaved] = useState(false);

  if (answers.hasMvp) return null;

  const handleSelect = (value: NonNullable<FounderMicroAnswers['hasMvp']>) => {
    saveFounderMicroAnswer('hasMvp', value);
    setAnswers({ ...answers, hasMvp: value });
    setSaved(true);
  };

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-muted/20 p-5', className)}
      aria-label={t('label')}
    >
      <AiPmConversation
        messages={
          saved
            ? [t('thanks'), t('savedFeedback')]
            : [t('lead'), t('question')]
        }
      />
      {!saved ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(['yes', 'no'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              className="rounded-xl border border-border/70 px-3 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              {t(`options.${option}`)}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
