'use client';

import { useState } from 'react';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { WhatIfScenario } from '../../constants/decision-experience';

type WhatIfScenarioPanelProps = {
  scenario: WhatIfScenario;
  onSimulate?: (scenario: WhatIfScenario) => void;
  className?: string;
};

export function WhatIfScenarioPanel({ scenario, onSimulate, className }: WhatIfScenarioPanelProps) {
  const t = useTranslations('workflow.founderAiPm.whatIf');
  const [simulated, setSimulated] = useState(false);
  const confidence = simulated ? scenario.confidenceAfter : scenario.confidenceBefore;

  const handleSimulate = () => {
    setSimulated(true);
    onSimulate?.(scenario);
  };

  return (
    <div className={cn('rounded-xl border border-dashed border-primary/40 bg-primary/[0.03] p-4', className)}>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <FlaskConical className="size-3.5" aria-hidden />
        {t('title')}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 rounded-lg"
        onClick={handleSimulate}
        aria-pressed={simulated}
      >
        {t(`actions.${scenario.labelKey}`)}
      </Button>
      <div className="mt-4 flex items-center gap-3">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('confidence')}</p>
          <p
            className={cn(
              'text-3xl font-bold tabular-nums transition-all duration-500',
              simulated ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground',
            )}
          >
            {confidence}
          </p>
        </div>
        {simulated ? (
          <>
            <ArrowRight className="size-5 text-emerald-600" aria-hidden />
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t('goProbability')}</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {scenario.goProbabilityAfter}%
              </p>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t('hint')}</p>
        )}
      </div>
    </div>
  );
}
