'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { ExecutiveDecisionBoardData } from '../../lib/founder-executive-decision-board';
import { starsDisplay } from '../../lib/founder-executive-decision-board';
import { DecisionGapChecklist } from '../founder-ai-pm/founder-decision-board-visuals';

type V2DecisionPanelSimpleProps = {
  data: ExecutiveDecisionBoardData;
};

function StarRow({ label, stars }: { label: string; stars: number }) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums tracking-wider">{starsDisplay(stars)}</span>
    </li>
  );
}

/** Conclusion-first decision — no tabs, no duplicate approve. */
export function V2DecisionPanelSimple({ data }: V2DecisionPanelSimpleProps) {
  const t = useTranslations('workflow.v2.detail.decision');
  const tBoard = useTranslations('workflow.founderAiPm.executiveDecisionBoard');
  const { decisionEngine } = data;

  const headline = useMemo(() => {
    if (decisionEngine.verdict === 'GO') return tBoard('executive.heroHeadline.go');
    if (decisionEngine.verdict === 'HOLD') return tBoard('executive.heroHeadline.hold');
    return tBoard('executive.heroHeadline.noGo');
  }, [decisionEngine.verdict, tBoard]);

  const whyRows = useMemo(() => {
    const market = data.why.find((item) => item.key === 'market');
    const pricing = data.why.find((item) => item.key === 'pricing');
    const mvp = data.why.find((item) => item.key === 'mvp');
    return [
      { label: tBoard('why.dimensions.market'), stars: market?.stars ?? 4 },
      { label: tBoard('executive.customer'), stars: Math.min(5, (mvp?.stars ?? 2) + 2) },
      { label: tBoard('why.dimensions.pricing'), stars: pricing?.stars ?? 2 },
    ];
  }, [data.why, tBoard]);

  const gapItems = useMemo(() => {
    const reasonByKey = (key: string) =>
      decisionEngine.todayReasons.find((item) => item.key === key)?.status;
    return [
      {
        key: 'pricing',
        label: tBoard('gapsPanel.items.pricingValidation'),
        hint: tBoard('gapsPanel.hints.pricingValidation'),
        checked: reasonByKey('pricing') === 'done',
      },
      {
        key: 'mvp',
        label: tBoard('gapsPanel.items.mvpBuild'),
        hint: tBoard('gapsPanel.hints.mvpBuild'),
        checked: reasonByKey('mvp') === 'done',
      },
    ].filter((item) => !item.checked);
  }, [decisionEngine.todayReasons, tBoard]);

  const todayAction = decisionEngine.approval?.title ?? t('todayFallback');

  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('label')}</p>

      <div className="mt-4">
        <p className="text-lg font-bold leading-snug">{headline}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
          {decisionEngine.scorePercent}%
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{t('whyLabel')}</p>
          <ul className="mt-2 space-y-1.5" role="list">
            {whyRows.map((row) => (
              <StarRow key={row.label} label={row.label} stars={row.stars} />
            ))}
          </ul>
        </div>

        {gapItems.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground">{t('gapsLabel')}</p>
            <DecisionGapChecklist items={gapItems} className="mt-2" />
          </div>
        ) : null}

        <div>
          <p className="text-xs font-semibold text-muted-foreground">{t('todayLabel')}</p>
          <p className="mt-2 text-sm font-medium">{todayAction}</p>
        </div>
      </div>
    </section>
  );
}
