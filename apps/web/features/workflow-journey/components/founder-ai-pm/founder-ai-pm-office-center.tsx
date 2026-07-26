'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

import type { DailyCeoHabitBrief } from '../../lib/founder-daily-ceo-habit';
import type { LivingMorningContext } from '../../lib/founder-living-project';
import type { OvernightInvestigationSnapshot } from '../../lib/founder-background-ai';
import { AiPmOfficeChat, type AiPmChatMessage } from '../ai-state/ai-pm-office-chat';

type FounderAiPmOfficeCenterProps = {
  habit: DailyCeoHabitBrief;
  livingMorningContext?: LivingMorningContext;
  overnightSnapshot: OvernightInvestigationSnapshot | null;
  approvedActionIds: string[];
  onApprove: (actionId: string) => void;
  onOvernightView?: () => void;
  scoreBefore?: number;
  scoreAfter?: number;
  lastActionTitle?: string;
  className?: string;
};

export function FounderAiPmOfficeCenter({
  habit,
  livingMorningContext,
  overnightSnapshot,
  approvedActionIds,
  onApprove,
  onOvernightView,
  scoreBefore,
  scoreAfter,
  lastActionTitle,
  className,
}: FounderAiPmOfficeCenterProps) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');
  const tOffice = useTranslations('workflow.founderAiPm.officeChat');
  const tLiving = useTranslations('workflow.founderAiPm.livingProject.morningContext');

  const messages = useMemo(() => {
    const list: AiPmChatMessage[] = [
      { role: 'ai', text: t('morning.greeting') },
    ];

    if (livingMorningContext?.weeklyProgressKey) {
      list.push({
        role: 'ai',
        text: tLiving(livingMorningContext.weeklyProgressKey as 'weekMarketAdvanced'),
      });
    }

    if (livingMorningContext?.stuckWarningKey) {
      list.push({
        role: 'ai',
        text: tLiving(
          livingMorningContext.stuckWarningKey as 'pricingPaused',
          livingMorningContext.stuckWarningParams ?? {},
        ),
      });
    }

    if (habit.morningChanges.length > 0) {
      const changes = habit.morningChanges
        .slice(0, 3)
        .map((item) => t(`morningChanges.${item.messageKey}`, item.params ?? {}))
        .join('\n');
      list.push({ role: 'ai', text: tOffice('morningChanges', { changes }) });
    }

    if (overnightSnapshot?.reportItems.length) {
      const report = overnightSnapshot.reportItems
        .slice(0, 3)
        .map((item) => t(`overnightReport.${item.messageKey}`, item.params ?? {}))
        .join('\n');
      list.push({ role: 'ai', text: tOffice('overnightDone', { report }) });
    } else if (habit.overnightReport.length > 0) {
      const report = habit.overnightReport
        .slice(0, 3)
        .map((item) => t(`overnightReport.${item.messageKey}`, item.params ?? {}))
        .join('\n');
      list.push({ role: 'ai', text: tOffice('overnightDone', { report }) });
    }

    if (habit.todayFocus) {
      list.push({
        role: 'ai',
        text: tOffice('todayFocus', {
          action: habit.todayFocus.title,
          impact: habit.todayFocus.goImpact,
        }),
      });
    }

    if (scoreBefore != null && scoreAfter != null && scoreAfter > scoreBefore) {
      list.push({
        role: 'ai',
        text: tOffice('resultUpdate', {
          action: lastActionTitle ?? t('todayFocus.label'),
          before: scoreBefore,
          after: scoreAfter,
        }),
      });
    }

    list.push({ role: 'ai', text: tOffice('decisionHint') });

    return list;
  }, [
    habit,
    lastActionTitle,
    tLiving,
    livingMorningContext?.weeklyProgressKey,
    livingMorningContext?.stuckWarningKey,
    livingMorningContext?.stuckWarningParams,
    overnightSnapshot?.reportItems,
    scoreAfter,
    scoreBefore,
    t,
    tOffice,
  ]);

  const focus = habit.todayFocus;
  const approved = focus ? approvedActionIds.includes(focus.actionId) : false;

  const footer =
    focus && !approved ? (
      <div className="space-y-3">
        <Button
          type="button"
          size="lg"
          className="h-12 w-full rounded-xl font-semibold"
          onClick={() => onApprove(focus.actionId)}
        >
          {tOffice('approveCta', { action: focus.title })}
        </Button>
        {onOvernightView ? (
          <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onOvernightView}>
            {t('overnightReport.viewCta')}
          </Button>
        ) : null}
      </div>
    ) : onOvernightView ? (
      <Button type="button" variant="outline" className="w-full rounded-xl" onClick={onOvernightView}>
        {t('overnightReport.viewCta')}
      </Button>
    ) : null;

  return <AiPmOfficeChat messages={messages} footer={footer} className={className} />;
}
