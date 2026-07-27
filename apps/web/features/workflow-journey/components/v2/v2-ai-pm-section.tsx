'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { DailyCeoHabitBrief } from '../../lib/founder-daily-ceo-habit';
import type { V2AiPmStatus } from '../../lib/v2-project-phase';
import type { ApprovalQueueItem } from '../../lib/founder-autonomous-ai-pm';
import {
  loadFounderMicroAnswers,
  saveFounderMicroAnswer,
} from '../../lib/founder-micro-interaction-store';

const OPTIONAL_KEYS = ['customer', 'mvp', 'pricing'] as const;

type V2AiPmSectionProps = {
  status: V2AiPmStatus;
  habit: DailyCeoHabitBrief;
  todayAction: ApprovalQueueItem | null;
  approved: boolean;
  onApprove: () => void;
};

export function V2AiPmSection({
  status,
  habit,
  todayAction,
  approved,
  onApprove,
}: V2AiPmSectionProps) {
  const t = useTranslations('workflow.v2.detail.aiPm');
  const tChanges = useTranslations('workflow.founderAiPm.dailyCeo.whatChanged.items');
  const [selectedOptional, setSelectedOptional] = useState<Set<string>>(new Set());
  const [microAnswers, setMicroAnswers] = useState(loadFounderMicroAnswers);

  const briefingLines = useMemo(() => {
    const lines = [t('greeting'), t('lead'), t('overnightLead')].filter(Boolean);
    for (const item of habit.whatChanged.slice(0, 3)) {
      lines.push(`• ${tChanges(item.messageKey, item.params ?? {})}`);
    }
    lines.push(t('recommendationHold'));
    if (todayAction) {
      lines.push(t('todayLead'));
      lines.push(todayAction.title);
    }
    return lines;
  }, [habit.whatChanged, t, tChanges, todayAction]);

  const toggleOptional = (key: (typeof OPTIONAL_KEYS)[number]) => {
    setSelectedOptional((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (key === 'customer') {
      saveFounderMicroAnswer('targetCustomer', 'office');
      setMicroAnswers({ ...microAnswers, targetCustomer: 'office' });
    }
    if (key === 'mvp') {
      saveFounderMicroAnswer('hasMvp', 'yes');
      setMicroAnswers({ ...microAnswers, hasMvp: 'yes' });
    }
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t('label')}</p>
        <p className="text-xs font-medium text-muted-foreground">
          {t('statusLabel')}{' '}
          <span className="text-foreground">{t(`status.${status}`)}</span>
        </p>
      </div>

      <div className="mt-4 space-y-1.5 text-sm leading-relaxed">
        {briefingLines.map((line, index) => (
          <p key={`${index}-${line.slice(0, 12)}`}>{line}</p>
        ))}
      </div>

      {todayAction && !approved ? (
        <Button
          type="button"
          size="lg"
          className="mt-5 h-12 w-full rounded-xl font-semibold"
          onClick={onApprove}
        >
          {t('approveCta')}
        </Button>
      ) : approved ? (
        <p className="mt-5 text-center text-sm font-medium text-emerald-600">{t('approved')}</p>
      ) : null}

      <div className="mt-6 border-t border-border/60 pt-5">
        <p className="text-sm text-muted-foreground">{t('optionalLead')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {OPTIONAL_KEYS.map((key) => {
            const active = selectedOptional.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleOptional(key)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/70 text-muted-foreground hover:border-primary/30',
                )}
              >
                {t(`optional.${key}`)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
