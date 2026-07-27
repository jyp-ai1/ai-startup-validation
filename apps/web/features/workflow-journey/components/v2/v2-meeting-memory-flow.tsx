'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import { getLatestMeetingNote } from '../../lib/v2-ai-pm-meeting-store';

type V2MeetingMemoryFlowProps = {
  reviewCount: number;
  className?: string;
};

export function V2MeetingMemoryFlow({ reviewCount, className }: V2MeetingMemoryFlowProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.meetingFlow');

  if (reviewCount < 1) return null;

  const latest = getLatestMeetingNote();
  const lastDate = latest?.meetingDate ?? '—';

  const steps = [
    { key: 'lastMeeting', detail: lastDate },
    { key: 'today', detail: t('todayDetail') },
    { key: 'nextMeeting', detail: t('nextDetail') },
  ] as const;

  return (
    <section className={cn('sr-only', className)} aria-hidden>
      {/* Meeting flow is embedded in Inbox + Meeting Note — no separate timeline UI */}
      <ol>
        {steps.map((step, index) => (
          <li key={step.key}>
            {t(`steps.${step.key}`)} — {step.detail}
            {index < steps.length - 1 ? <ArrowDown className="size-3" /> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
