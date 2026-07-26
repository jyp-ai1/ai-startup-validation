'use client';

import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { cn } from '@repo/ui/lib/utils';

type DecisionOneLinePanelProps = {
  className?: string;
  fallbackConfidence?: number;
};

export function DecisionOneLinePanel({ className }: DecisionOneLinePanelProps) {
  const t = useTranslations('workflow.aiPm.decision');
  const pipeline = loadAgentPipelineResult();
  const verdict = pipeline?.decision?.verdict ?? 'HOLD';
  const gap = pipeline?.decision?.intelligence?.gap ?? pipeline?.decision?.missingData?.[0];
  const primaryAction = pipeline?.founderOs?.todayActions?.[0];
  const minutes = primaryAction?.etaMinutes ?? 15;
  const impact = primaryAction?.goImpact ?? 4;
  const actionTitle = primaryAction?.title;

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
          {t('riskFollowUp', { gap })}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t('riskDefault')}
        </p>
      )}
      {actionTitle ? (
        <p className="mt-4 whitespace-pre-line rounded-xl bg-primary/[0.06] px-4 py-3 text-sm leading-relaxed">
          {t('recommendAction', { action: actionTitle, minutes, impact })}
        </p>
      ) : (
        <p className="mt-4 whitespace-pre-line rounded-xl bg-primary/[0.06] px-4 py-3 text-sm leading-relaxed">
          {t('recommendDefault', { minutes, impact })}
        </p>
      )}
    </section>
  );
}
