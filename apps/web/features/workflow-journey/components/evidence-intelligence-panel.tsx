'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Shield } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import {
  CONFIDENCE_RULES,
  DECISION_STABILITY,
  FUTURE_GAIN,
  HEALTH_DETAIL,
  MISSING_DATA,
  MOCK_EVIDENCE,
} from '../constants/intelligence-mock';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { calculateConfidence } from '../lib/confidence-rule-engine';
import { ConfidenceMeter } from './confidence-meter';
import { EvidenceCard } from './evidence-card';
import { MissingDataProgress } from './missing-data-progress';

type EvidenceIntelligencePanelProps = {
  evidenceOpen?: boolean;
  completedRuleIds?: string[];
  verdict?: string;
  confidenceValue?: number;
};

export function EvidenceIntelligencePanel({
  evidenceOpen: defaultOpen = false,
  completedRuleIds = [],
  verdict = 'HOLD',
  confidenceValue = FUTURE_GAIN.current,
}: EvidenceIntelligencePanelProps) {
  const t = useTranslations('workflow.intelligence');
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
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm leading-relaxed text-foreground/90">
            {t('coachTone.hold')}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('stability.title')}</p>
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">
              {DECISION_STABILITY.label}{' '}
              <span className="tabular-nums text-muted-foreground">{DECISION_STABILITY.score}%</span>
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('futureGain.title')}
            </p>
            <ConfidenceMeter value={FUTURE_GAIN.current} target={FUTURE_GAIN.target} animate className="mt-2" />
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">{t(`actions.${FUTURE_GAIN.nextActionKey}`)}</span>
              {' → '}
              <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {FUTURE_GAIN.afterAction}%
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('evidence.section')}
            </p>
            {MOCK_EVIDENCE.map((item) => (
              <EvidenceCard key={item.id} item={item} />
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('rules.title')}</p>
            <ul className="mt-2 space-y-1" role="list">
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
          </div>

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

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('health.title')}</p>
            <ul className="mt-2 space-y-1.5" role="list">
              {(Object.keys(HEALTH_DETAIL) as (keyof typeof HEALTH_DETAIL)[]).map((key) => {
                const value = HEALTH_DETAIL[key];
                const warn = value < 60;
                return (
                  <li key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t(`health.${key}`)}</span>
                    <span className={cn('font-semibold tabular-nums', warn && 'text-amber-700 dark:text-amber-400')}>
                      {value}
                      {warn ? ' ⚠' : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
