'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { FounderMicroAnswers } from '../../lib/founder-micro-interaction-store';

type AiPmMicroQuestionProps = {
  questionId: 'targetCustomer';
  selected?: FounderMicroAnswers['targetCustomer'];
  onSelect: (value: NonNullable<FounderMicroAnswers['targetCustomer']>) => void;
  className?: string;
};

const TARGET_CUSTOMER_OPTIONS = ['office', 'student', 'enterprise', 'unknown'] as const;

export function AiPmMicroQuestion({
  questionId,
  selected,
  onSelect,
  className,
}: AiPmMicroQuestionProps) {
  const t = useTranslations(`workflow.aiPm.microQuestion.${questionId}`);
  const th = useTranslations('workflow.aiPm.microQuestion');

  return (
    <div
      className={cn(
        'rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 sm:p-5',
        className,
      )}
    >
      <p className="whitespace-pre-line text-sm leading-relaxed">{t('prompt')}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {TARGET_CUSTOMER_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
              selected === option
                ? 'border-primary bg-primary/10 font-medium text-foreground'
                : 'border-border/70 bg-background hover:border-primary/40',
            )}
          >
            {t(`options.${option}`)}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{th('hint')}</p>
    </div>
  );
}
