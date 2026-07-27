'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { V2EvidenceField, V2ValidationEvidence } from '../../lib/v2-validation-store';
import { isEvidenceFieldFilled } from '../../lib/v2-validation-store';
import { getEvidenceValue } from '../../lib/v2-review-board';

const CARD = 'rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/40';

type MeetingSectionId = 'market' | 'customer' | 'pricing' | 'differentiation';

type V2ReviewMeetingBoardProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  onAddField?: (field: V2EvidenceField) => void;
  className?: string;
  animateIn?: boolean;
};

export function V2ReviewMeetingBoard({
  evidence,
  reviewCount,
  onAddField,
  className,
  animateIn = true,
}: V2ReviewMeetingBoardProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.meetingBoard');
  const [expanded, setExpanded] = useState<MeetingSectionId | null>(null);

  const sections: {
    id: MeetingSectionId;
    field?: V2EvidenceField;
    summaryKey: string;
    detailKey?: string;
    emptyKey?: string;
    addField?: V2EvidenceField;
  }[] = [
    {
      id: 'market',
      summaryKey: 'marketSummary',
      detailKey: 'marketDetail',
    },
    {
      id: 'customer',
      field: 'customer',
      summaryKey: 'customerSummary',
      detailKey: 'customerDetail',
      emptyKey: 'customerEmpty',
      addField: 'customer',
    },
    {
      id: 'pricing',
      field: 'pricing',
      summaryKey: 'pricingSummary',
      emptyKey: 'pricingEmpty',
      addField: 'pricing',
    },
    {
      id: 'differentiation',
      field: 'mvp',
      summaryKey: 'differentiationSummary',
      emptyKey: 'differentiationEmpty',
      addField: 'mvp',
    },
  ];

  return (
    <section
      className={cn(
        CARD,
        'transition-all duration-500 ease-out',
        animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        className,
      )}
    >
      <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t('reviewRound', { count: reviewCount })}
      </p>

      <div className="mt-6 divide-y divide-border/50">
        {sections.map((section) => {
          const filled = section.field
            ? isEvidenceFieldFilled(section.field, evidence)
            : true;
          const value = section.field ? getEvidenceValue(section.field, evidence) : null;
          const isOpen = expanded === section.id;

          let summary: string;
          if (section.id === 'market') {
            summary = t(section.summaryKey);
          } else if (filled && value) {
            summary = t(section.summaryKey, { value });
          } else {
            summary = t(section.emptyKey ?? section.summaryKey);
          }

          return (
            <div key={section.id} className="py-4 first:pt-0 last:pb-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t(`sections.${section.id}`)}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed">{summary}</p>

              <div className="mt-2 flex gap-3">
                {section.detailKey && section.id === 'market' ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : section.id)}
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {isOpen ? t('collapse') : t('expand')}
                  </button>
                ) : null}
                {!filled && section.addField && onAddField ? (
                  <button
                    type="button"
                    onClick={() => onAddField(section.addField!)}
                    className="text-xs text-primary transition-opacity hover:opacity-80"
                  >
                    {t('addInput')}
                  </button>
                ) : null}
              </div>

              {isOpen && section.detailKey ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground animate-in fade-in duration-200">
                  {t(section.detailKey)}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
