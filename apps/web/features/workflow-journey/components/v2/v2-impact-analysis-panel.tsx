'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import {
  type ChangedField,
  type ImpactLevel,
  getImpactAnalysis,
  hasAnyImpact,
} from '../../lib/v2-impact-analysis';
import type { InvestigationTopic } from '../../lib/v2-next-action-engine';

type V2ImpactAnalysisPanelProps = {
  changedField: ChangedField | null;
  isStale: boolean;
  className?: string;
};

const TOPICS: InvestigationTopic[] = ['market', 'competition', 'pricing', 'differentiation'];

export function V2ImpactAnalysisPanel({
  changedField,
  isStale,
  className,
}: V2ImpactAnalysisPanelProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.impactAnalysis');
  const impacts = getImpactAnalysis(changedField, isStale);

  if (!isStale || !hasAnyImpact(impacts)) return null;

  return (
    <section
      className={cn(
        'rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 motion-safe:animate-in motion-safe:fade-in',
        className,
      )}
      role="status"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-600" aria-hidden />
        <h3 className="text-sm font-semibold">{t('title')}</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {TOPICS.map((topic) => (
          <ImpactRow key={topic} topic={topic} level={impacts[topic]} t={t} />
        ))}
      </ul>
    </section>
  );
}

function ImpactRow({
  topic,
  level,
  t,
}: {
  topic: InvestigationTopic;
  level: ImpactLevel;
  t: ReturnType<typeof useTranslations>;
}) {
  if (level === 'none') {
    return (
      <li className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{t(`topics.${topic}`)}</span>
        <span className="text-xs">{t('levels.none')}</span>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="font-medium">{t(`topics.${topic}`)}</span>
      <span
        className={cn(
          'text-xs font-medium',
          level === 'stale' ? 'text-amber-700 dark:text-amber-300' : 'text-orange-600',
        )}
      >
        ⚠ {t(`levels.${level}`)}
      </span>
    </li>
  );
}

export type { ChangedField };
