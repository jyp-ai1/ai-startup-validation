'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';

import {
  CONFIDENCE_RULES,
  FUTURE_GAIN,
  MOCK_EVIDENCE,
  MISSING_DATA,
} from '../constants/intelligence-mock';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { calculateConfidence } from '../lib/confidence-rule-engine';
import { ConfidenceMeter } from './confidence-meter';
import { EvidenceCard } from './evidence-card';
import { MissingDataProgress } from './missing-data-progress';
import { ProjectHealthVisual } from './project-health-visual';

type EvidenceIntelligencePanelProps = {
  evidenceOpen?: boolean;
  completedRuleIds?: string[];
  verdict?: string;
  confidenceValue?: number;
};

function FlowSection({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-background/80 p-3">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {step}
        </span>
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function EvidenceIntelligencePanel({
  evidenceOpen: defaultOpen = false,
  completedRuleIds = [],
  verdict = 'HOLD',
  confidenceValue = FUTURE_GAIN.current,
}: EvidenceIntelligencePanelProps) {
  const t = useTranslations('workflow.intelligence');
  const tf = useTranslations('workflow.intelligence.flow');
  const analytics = useJourneyAnalytics();
  const [completedMissingIds, setCompletedMissingIds] = useState<string[]>([]);
  const [open, setOpen] = useState(defaultOpen);

  const breakdown = calculateConfidence(FUTURE_GAIN.current, completedRuleIds, CONFIDENCE_RULES, FUTURE_GAIN.target);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        analytics.trackWhyOpened(verdict);
        analytics.trackConfidenceOpened(confidenceValue);
      }
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-background/90">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-foreground">{t('drawerTitle')}</span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
        )}
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-3">
          <FlowSection step={1} title={tf('why')}>
            <p className="text-sm leading-relaxed text-foreground/90">{t('coachTone.hold')}</p>
          </FlowSection>

          <FlowSection step={2} title={tf('evidence')}>
            <div className="space-y-2">
              {MOCK_EVIDENCE.map((item, index) => (
                <EvidenceCard key={item.id} item={item} animationIndex={index} />
              ))}
            </div>
          </FlowSection>

          <FlowSection step={3} title={tf('citation')}>
            <ul className="space-y-1.5 text-sm" role="list">
              {MOCK_EVIDENCE.flatMap((item) =>
                item.sources.map((source) => (
                  <li key={source.id} className="flex justify-between gap-2 rounded-lg bg-muted/30 px-2 py-1.5">
                    <span className="text-foreground">{source.name}</span>
                    <span className="shrink-0 text-xs uppercase text-muted-foreground">{source.type}</span>
                  </li>
                )),
              )}
            </ul>
          </FlowSection>

          <FlowSection step={4} title={tf('confidence')}>
            <ConfidenceMeter
              value={FUTURE_GAIN.current}
              target={FUTURE_GAIN.target}
              animate
              gamified
              label={t('futureGain.title')}
            />
            <ul className="mt-3 space-y-1" role="list">
              {CONFIDENCE_RULES.map((rule) => (
                <li key={rule.id} className="flex justify-between text-sm">
                  <span>{t(`rules.${rule.labelKey}`)}</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">+{rule.gain}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('rules.calculated', { value: breakdown.total })}
            </p>
          </FlowSection>

          <FlowSection step={5} title={tf('missing')}>
            <MissingDataProgress
              current={FUTURE_GAIN.current}
              target={FUTURE_GAIN.target}
              items={MISSING_DATA}
              completedIds={[...completedRuleIds, ...completedMissingIds]}
              onItemToggle={(id) => {
                setCompletedMissingIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                );
                analytics.trackCoachClicked('missing_data');
              }}
            />
          </FlowSection>

          <FlowSection step={6} title={tf('futureGain')}>
            <p className="text-sm text-muted-foreground">{t(`actions.${FUTURE_GAIN.nextActionKey}`)}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {FUTURE_GAIN.afterAction}%
            </p>
          </FlowSection>

          <FlowSection step={7} title={t('health.title')}>
            <ProjectHealthVisual />
          </FlowSection>
        </div>
      ) : null}
    </div>
  );
}
