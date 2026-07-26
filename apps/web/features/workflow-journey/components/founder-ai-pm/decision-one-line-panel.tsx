'use client';

import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { cn } from '@repo/ui/lib/utils';

type DecisionOneLinePanelProps = {
  className?: string;
  fallbackConfidence?: number;
};

export function DecisionOneLinePanel({ className, fallbackConfidence = 62 }: DecisionOneLinePanelProps) {
  const t = useTranslations('workflow.aiPm.decision');
  const pipeline = loadAgentPipelineResult();
  const verdict = pipeline?.decision?.verdict ?? 'HOLD';
  const intel = pipeline?.decision?.intelligence;
  const gap = intel?.gap ?? pipeline?.decision?.missingData?.[0];

  const headlineKey =
    verdict === 'GO' ? 'headlineGo' : verdict === 'NO_GO' ? 'headlineNoGo' : 'headlineHold';

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
        {t('label')}
      </p>
      <p className="mt-3 text-xl font-semibold leading-snug sm:text-2xl">{t(headlineKey)}</p>
      {gap ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
          {t('followUp', { gap })}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t('followUpDefault', { confidence: pipeline?.decision?.confidence ?? fallbackConfidence })}
        </p>
      )}
    </section>
  );
}
