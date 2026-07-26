'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

import type { DailyCeoHabitBrief } from '../../lib/founder-daily-ceo-habit';
import type { LivingMorningContext } from '../../lib/founder-living-project';
import type { OvernightInvestigationSnapshot } from '../../lib/founder-background-ai';
import { buildSignatureMorningGreeting } from '../../lib/founder-morning-signature';
import { AiPmOfficeChat, type AiPmChatMessage } from '../ai-state/ai-pm-office-chat';

const THINKING_FEED = [
  { time: '09:12', key: 'marketDone' },
  { time: '09:18', key: 'grantsDone' },
  { time: '09:22', key: 'pricingNote' },
  { time: '09:25', key: 'recommendHold' },
] as const;

type FounderAiPmOfficeCenterProps = {
  habit: DailyCeoHabitBrief;
  livingMorningContext?: LivingMorningContext;
  overnightSnapshot: OvernightInvestigationSnapshot | null;
  approvedActionIds: string[];
  onApprove: (actionId: string) => void;
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
      { role: 'ai', text: buildSignatureMorningGreeting(t) },
    ];

    const overnightItems = overnightSnapshot?.reportItems ?? habit.overnightReport;

    if (overnightItems.length > 0) {
      const startMinutes = 9 * 60 + 12;
      for (const [index, item] of overnightItems.slice(0, 4).entries()) {
        const minutes = startMinutes + index * 6;
        const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
        list.push({
          role: 'ai',
          time,
          text: t(`overnightReport.${item.messageKey}`),
        });
      }
    } else {
      for (const entry of THINKING_FEED) {
        list.push({
          role: 'ai',
          time: entry.time,
          text: tOffice(`thinkingFeed.${entry.key}`),
        });
      }
    }

    const changeCount =
      overnightSnapshot?.importantCount ??
      overnightSnapshot?.whatChanged?.length ??
      habit.whatChanged.length;

    if (changeCount > 0) {
      const changes =
        overnightSnapshot?.whatChanged ??
        habit.whatChanged.slice(0, Math.min(changeCount, 3));
      for (const item of changes.slice(0, 3)) {
        list.push({
          role: 'ai',
          text: t(`whatChanged.items.${item.messageKey}`, item.params ?? {}),
        });
      }
    }

    if (livingMorningContext?.stuckWarningKey) {
      list.push({
        role: 'ai',
        time: '09:26',
        text: tLiving(
          livingMorningContext.stuckWarningKey as 'pricingPaused',
          livingMorningContext.stuckWarningParams ?? {},
        ),
      });
    }

    if (habit.todayFocus) {
      list.push({
        role: 'ai',
        time: '09:28',
        text: tOffice('todayProposal', {
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
    habit.overnightReport,
    habit.todayFocus,
    habit.whatChanged,
    lastActionTitle,
    livingMorningContext?.stuckWarningKey,
    livingMorningContext?.stuckWarningParams,
    overnightSnapshot,
    scoreAfter,
    scoreBefore,
    t,
    tLiving,
    tOffice,
  ]);

  const focus = habit.todayFocus;
  const approved = focus ? approvedActionIds.includes(focus.actionId) : false;

  const footer =
    focus && !approved ? (
      <Button
        type="button"
        size="lg"
        className="h-12 w-full rounded-xl font-semibold"
        onClick={() => onApprove(focus.actionId)}
      >
        {tOffice('approveCta', { action: focus.title })}
      </Button>
    ) : null;

  return <AiPmOfficeChat messages={messages} footer={footer} className={className} />;
}
