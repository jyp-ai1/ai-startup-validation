'use client';

import { useTranslations } from 'next-intl';

import type { ConsultantProjectContext } from '../services/consultant-types';

type ConsultantContextPanelProps = {
  context: ConsultantProjectContext;
};

export function ConsultantContextPanel({ context }: ConsultantContextPanelProps) {
  const t = useTranslations('aiConsultant');

  const rows = [
    { labelKey: 'context.fieldIndustry', value: context.industry ?? t('context.industryUnknown') },
    { labelKey: 'context.fieldStage', value: t(context.stageKey as 'context.stages.draft') },
    { labelKey: 'context.fieldTarget', value: context.target ?? t('context.targetUnknown') },
    { labelKey: 'context.fieldScore', value: String(context.score) },
    { labelKey: 'context.fieldDecision', value: t(context.decisionLabelKey as 'context.decisions.blocked') },
    { labelKey: 'context.fieldTimeline', value: t(context.timelineStageKey as 'context.timeline.early') },
  ] as const;

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('context.title')}
      </h3>
      <dl className="space-y-2 text-sm">
        {rows.map(({ labelKey, value }) => (
          <div key={labelKey} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t(labelKey)}</dt>
            <dd className="max-w-[55%] truncate text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
