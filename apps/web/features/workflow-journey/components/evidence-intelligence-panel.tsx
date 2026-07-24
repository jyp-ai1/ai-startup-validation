'use client';

import { useState } from 'react';
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
import { calculateConfidence } from '../lib/confidence-rule-engine';
import { EvidenceCard } from './evidence-card';

type EvidenceIntelligencePanelProps = {
  evidenceOpen?: boolean;
  completedRuleIds?: string[];
};

export function EvidenceIntelligencePanel({
  evidenceOpen: defaultOpen = false,
  completedRuleIds = [],
}: EvidenceIntelligencePanelProps) {
  const t = useTranslations('workflow.intelligence');
  const [open, setOpen] = useState(defaultOpen);

  const breakdown = calculateConfidence(FUTURE_GAIN.current, completedRuleIds, CONFIDENCE_RULES, FUTURE_GAIN.target);

  return (
    <div className="rounded-xl border border-border/60 bg-background/90">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('futureGain.title')}
            </p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="font-bold tabular-nums">{FUTURE_GAIN.current}%</span>
              <span className="text-muted-foreground">↓</span>
              <span className="text-right">
                <span className="block text-xs text-muted-foreground">{t(`actions.${FUTURE_GAIN.nextActionKey}`)}</span>
                <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {FUTURE_GAIN.afterAction}%
                </span>
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('futureGain.target', { value: FUTURE_GAIN.target })}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('evidence.section')}</p>
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

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('missing.title')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('missing.subtitle', { current: FUTURE_GAIN.current, target: FUTURE_GAIN.target })}
            </p>
            <ul className="mt-2 space-y-2" role="list">
              {MISSING_DATA.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 px-3 py-2 text-sm"
                >
                  <span className="size-4 shrink-0 rounded border border-muted-foreground/50" aria-hidden />
                  <span className="flex-1">{t(`missing.items.${item.labelKey}`)}</span>
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">+{item.gain}</span>
                </li>
              ))}
            </ul>
          </div>

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
