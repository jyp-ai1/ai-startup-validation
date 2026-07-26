'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { AiPmDecisionBox } from '../../lib/founder-ai-pm-meeting';

type FounderDecisionBoxPanelProps = {
  decision: AiPmDecisionBox;
  onSelect: (actionId?: string, source?: string) => void;
  className?: string;
};

export function FounderDecisionBoxPanel({
  decision,
  onSelect,
  className,
}: FounderDecisionBoxPanelProps) {
  const t = useTranslations('workflow.founderAiPm.meeting');

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('decisionBox.label')}
    >
      <p className="text-sm font-semibold">{t('decisionBox.title')}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {t('decisionBox.question')}
      </p>

      <div className="mt-5 space-y-3">
        {decision.options
          .filter((option) => option.id !== 'recommended')
          .map((option) => (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              className="h-auto min-h-12 w-full justify-start whitespace-normal rounded-xl px-4 py-3 text-left text-sm"
              onClick={() => onSelect(option.actionId, `decision_${option.id}`)}
            >
              {t(`decisionBox.options.${option.id}`)}
            </Button>
          ))}

        <Button
          type="button"
          size="lg"
          className="h-auto min-h-14 w-full whitespace-normal rounded-xl px-4 py-3 text-base font-semibold"
          onClick={() =>
            onSelect(
              decision.options.find((option) => option.id === 'recommended')?.actionId,
              'decision_recommended',
            )
          }
        >
          {t('decisionBox.recommendedCta')}
        </Button>
      </div>
    </section>
  );
}
