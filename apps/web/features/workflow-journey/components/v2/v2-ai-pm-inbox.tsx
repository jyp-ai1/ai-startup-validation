'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import { resolveMorningBriefNamespace } from '@/lib/project/morning-brief-namespace';
import {
  getLatestMeetingNote,
  markMeetingNoteRead,
  saveFounderMemo,
} from '../../lib/v2-ai-pm-meeting-store';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';
import { V2AiPmWorkingExperience } from './v2-ai-pm-working-experience';

type V2AiPmInboxProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
  stale?: boolean;
  readOnly?: boolean;
  onContinue: () => void;
  onShowEvidence?: (evidenceKey: string) => void;
  className?: string;
};

export function V2AiPmInbox({
  evidence,
  reviewCount,
  hasIdea,
  investigationViewed,
  stale = false,
  readOnly = false,
  onContinue,
  onShowEvidence,
  className,
}: V2AiPmInboxProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.aiPmInbox');
  const briefNamespace = resolveMorningBriefNamespace();
  const deliveryLead =
    briefNamespace === 'firstInvestigation'
      ? t('deliveryLeadFirst')
      : t('deliveryLeadReturn');
  const [read, setRead] = useState(false);

  useEffect(() => {
    const latest = getLatestMeetingNote();
    if (latest?.readAt) setRead(true);
  }, [reviewCount]);

  const handleContinue = () => {
    const latest = getLatestMeetingNote();
    if (latest && !latest.readAt) {
      markMeetingNoteRead(latest.id);
      setRead(true);
    }
    onContinue();
  };

  return (
    <section
      id="journey-section-investigation"
      className={cn(
        'rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-background shadow-sm',
        className,
      )}
    >
      <div className="border-b border-border/40 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Inbox className="size-4 text-primary" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
          </div>
          {read ? (
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {t('readBadge')}
            </span>
          ) : null}
        </div>
        {deliveryLead ? (
          <p className="mt-3 text-sm font-medium leading-relaxed">{deliveryLead}</p>
        ) : null}
      </div>

      <div id="ai-pm-inbox" className="px-5 py-5">
        {stale ? (
          <p className="mb-4 text-sm text-amber-800 dark:text-amber-200">{t('staleHint')}</p>
        ) : null}

        <V2AiPmWorkingExperience
          evidence={evidence}
          reviewCount={reviewCount}
          hasIdea={hasIdea}
          investigationViewed={investigationViewed}
          readOnly={readOnly}
          onPrimaryAction={handleContinue}
          onShowEvidence={() => onShowEvidence?.('googleTrends')}
          onFounderDecision={(reply) => {
            const latest = getLatestMeetingNote();
            if (latest) saveFounderMemo(latest.id, reply);
          }}
        />
      </div>
    </section>
  );
}
