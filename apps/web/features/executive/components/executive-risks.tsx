'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import type { RiskMatrixItem } from '@/features/decision';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { cn } from '@repo/ui/lib/utils';

type ExecutiveRisksProps = {
  risks: RiskMatrixItem[];
  projectId: string;
};

const LEVEL_SCORE: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const HEAT_CLASS: Record<number, string> = {
  9: 'bg-rose-600/80',
  6: 'bg-rose-500/60',
  4: 'bg-amber-500/50',
  3: 'bg-amber-400/40',
  2: 'bg-emerald-500/30',
  1: 'bg-emerald-500/20',
};

function heatScore(probability: string, impact: string): number {
  return (LEVEL_SCORE[probability] ?? 1) * (LEVEL_SCORE[impact] ?? 1);
}

export function ExecutiveRisks({ risks, projectId }: ExecutiveRisksProps) {
  const t = useTranslations('decision');
  const te = useTranslations('executive');
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.riskView, { project_id: projectId });
  }, [projectId, trackEvent]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{te('risks.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{te('risks.desc')}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-semibold">{te('risks.columns.risk')}</th>
              <th className="px-5 py-3 font-semibold">{te('risks.columns.impact')}</th>
              <th className="px-5 py-3 font-semibold">{te('risks.columns.probability')}</th>
              <th className="px-5 py-3 font-semibold">{te('risks.columns.mitigation')}</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((risk) => (
              <tr key={risk.id} className="border-b border-border/30 last:border-0">
                <td className="px-5 py-4 font-medium">
                  {t(risk.riskKey as 'risks.competitionIntensity')}
                </td>
                <td className="px-5 py-4">{t(`impact.${risk.impact.toLowerCase()}` as 'impact.high')}</td>
                <td className="px-5 py-4">
                  {t(`probability.${risk.probability.toLowerCase()}` as 'probability.high')}
                </td>
                <td className="px-5 py-4 text-muted-foreground">
                  {t(risk.mitigationKey as 'risks.competitionMitigation')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {te('risks.heatmap')}
        </p>
        <div className="grid grid-cols-3 gap-1 max-w-xs">
          {risks.slice(0, 5).map((risk) => {
            const score = heatScore(risk.probability, risk.impact);
            return (
              <div
                key={risk.id}
                className={cn(
                  'flex aspect-square items-center justify-center rounded text-[10px] font-medium text-foreground/80',
                  HEAT_CLASS[score] ?? 'bg-muted',
                )}
                title={t(risk.riskKey as 'risks.competitionIntensity')}
              >
                {score}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
