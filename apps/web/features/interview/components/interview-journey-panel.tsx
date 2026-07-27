import { Check, Circle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { JOURNEY_STEP_IDS, journeyStatusForIndex } from '../constants/journey-steps';

type InterviewJourneyPanelProps = {
  completedQuestions: number;
  interviewComplete: boolean;
};

export async function InterviewJourneyPanel({
  completedQuestions,
  interviewComplete,
}: InterviewJourneyPanelProps) {
  const t = await getTranslations('interview.journey');

  return (
    <aside className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
      <ol className="space-y-3">
        {JOURNEY_STEP_IDS.map((stepId, index) => {
          const status = journeyStatusForIndex(index, completedQuestions, interviewComplete);
          return (
            <li key={stepId} className="flex items-center gap-2.5 text-sm">
              {status === 'done' ? (
                <Check className="size-4 shrink-0 text-primary" aria-hidden />
              ) : status === 'current' ? (
                <span className="flex size-4 shrink-0 items-center justify-center text-primary">
                  ▶
                </span>
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground/40" aria-hidden />
              )}
              <span
                className={
                  status === 'current'
                    ? 'font-medium text-foreground'
                    : status === 'done'
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/70'
                }
              >
                {t(stepId)}
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
