'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { buildAiPmInbox } from '../../lib/v2-ai-pm-inbox-data';
import { getLatestMeetingNote, markMeetingNoteRead } from '../../lib/v2-ai-pm-meeting-store';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';

type V2AiPmInboxProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
  stale?: boolean;
  readOnly?: boolean;
  onContinue: () => void;
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
  className,
}: V2AiPmInboxProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.aiPmInbox');
  const [read, setRead] = useState(false);

  const report = buildAiPmInbox({
    evidence,
    reviewCount,
    hasIdea,
    investigationViewed,
  });

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
      id="ai-pm-inbox"
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
          {read || !report.showReadBadge ? (
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {t('readBadge')}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm font-medium leading-relaxed">{t('deliveryLead')}</p>
      </div>

      <div className="space-y-5 px-5 py-5">
        {report.mode === 'resume' && report.resumeMemo ? (
          <div className="space-y-3 text-sm leading-relaxed">
            <p>{t('resumeGreeting')}</p>
            <p className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5 italic">
              &ldquo;{report.resumeMemo}&rdquo;
            </p>
            <p>{t('resumeBody')}</p>
            <p className="font-medium">
              {t(`resumeFocus.${report.resumeFocusKey ?? 'pricingContinue'}`)}
            </p>
          </div>
        ) : report.mode === 'report' ? (
          <>
            <p className="text-sm font-semibold">{t(`headline.${report.headlineKey}`)}</p>

            {stale ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">{t('staleHint')}</p>
            ) : null}

            <div>
              <p className="text-xs font-medium text-muted-foreground">{t('findingsTitle')}</p>
              <ol className="mt-2 space-y-1.5 text-sm">
                {report.newFindings.map((item, index) => (
                  <li key={item.id}>
                    {index + 1}. {t(`findings.${item.textKey}`)}
                  </li>
                ))}
              </ol>
            </div>

            {report.risks.length > 0 ? (
              <div>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{t('riskTitle')}</p>
                <p className="mt-1 text-sm">{t(`risks.${report.risks[0].textKey}`)}</p>
              </div>
            ) : null}

            <p className="border-t border-border/40 pt-4 text-sm font-medium">
              {t(`todayTask.${report.todayTaskKey}`)}
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t(`firstVisit.${report.headlineKey}`)}
          </p>
        )}

        {!readOnly ? (
          <Button type="button" className="w-full rounded-lg sm:w-auto" onClick={handleContinue}>
            {report.mode === 'resume' ? t('ctaResume') : t('ctaContinue')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
