'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, ChevronDown } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  V2_EVIDENCE_OPTIONAL_FIELDS,
  type V2EvidenceField,
  type V2ValidationEvidence,
  isEvidenceFieldFilled,
  saveV2Validation,
} from '../../lib/v2-validation-store';
import { JourneyLayout } from '../journey-layout';
import {
  V2ReviewStatusPanel,
  V2ReviewUnderstandingPanel,
} from './v2-review-board-panels';
import { V2JourneyStack } from './v2-journey-stack';

export function V2ValidationView() {
  const t = useTranslations('workflow.v2.validation');
  const router = useRouter();
  const [idea, setIdea] = useState('');
  const [optional, setOptional] = useState<Record<V2EvidenceField, string>>({
    problem: '',
    customer: '',
    mvp: '',
    pricing: '',
  });
  const [expanded, setExpanded] = useState<Set<V2EvidenceField>>(new Set());

  const evidence = useMemo(
    (): V2ValidationEvidence => ({
      idea: idea.trim(),
      problem: optional.problem.trim() || undefined,
      customer: optional.customer.trim() || undefined,
      mvp: optional.mvp.trim() || undefined,
      pricing: optional.pricing.trim() || undefined,
    }),
    [idea, optional],
  );

  const hasIdea = isEvidenceFieldFilled('idea', evidence);

  const toggleSection = (field: V2EvidenceField) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const updateOptional = (field: V2EvidenceField, value: string) => {
    setOptional((prev) => ({ ...prev, [field]: value }));
    if (value.trim().length > 0) {
      setExpanded((prev) => new Set(prev).add(field));
    }
  };

  const handleStartReview = () => {
    if (!hasIdea) return;
    saveV2Validation(evidence);
    router.push('/investigate');
  };

  return (
    <JourneyLayout phase="workflow" width="default" versionLabel="V2">
      <V2JourneyStack
        embedded
        main={
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold">{t('ideaLabel')}</h1>
              <textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder={t('ideaPlaceholder')}
                rows={3}
                className="mt-3 w-full resize-none rounded-xl border border-border/70 bg-background px-4 py-3 text-base outline-none ring-primary/30 focus:ring-2"
              />
            </div>

            <V2ReviewUnderstandingPanel evidence={evidence} />

            <div className="border-t border-border/60 pt-6">
              <p className="text-sm leading-relaxed text-muted-foreground">{t('evidenceLead')}</p>

              <div className="mt-4 space-y-2">
                {V2_EVIDENCE_OPTIONAL_FIELDS.map((field) => {
                  const isOpen = expanded.has(field);
                  const filled = isEvidenceFieldFilled(field, evidence);
                  return (
                    <div
                      key={field}
                      className="overflow-hidden rounded-xl border border-border/70 bg-card"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(field)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted/30"
                      >
                        <span>
                          + {t(`optional.${field}`)}
                          {filled ? (
                            <span className="ml-2 text-xs font-normal text-primary">
                              {t('filledBadge')}
                            </span>
                          ) : null}
                        </span>
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform',
                            isOpen ? 'rotate-180' : '',
                          )}
                          aria-hidden
                        />
                      </button>
                      {isOpen ? (
                        <div className="space-y-2 border-t border-border/60 px-4 pb-4 pt-3">
                          <label htmlFor={`evidence-${field}`} className="text-sm text-foreground">
                            {t(`questions.${field}`)}
                          </label>
                          <textarea
                            id={`evidence-${field}`}
                            value={optional[field]}
                            onChange={(event) => updateOptional(field, event.target.value)}
                            rows={3}
                            placeholder={t('answerPlaceholder')}
                            className="w-full resize-none rounded-xl border border-border/70 bg-background px-4 py-3 text-sm outline-none ring-primary/30 focus:ring-2"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        }
        result={
          <div className="space-y-5">
            <V2ReviewStatusPanel evidence={evidence} phase="beforeReview" />

            <p className="text-sm leading-relaxed text-muted-foreground">{t('reviewDisclaimer')}</p>

            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-xl font-semibold"
              disabled={!hasIdea}
              onClick={handleStartReview}
            >
              {t('reviewStartCta')}
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Button>
          </div>
        }
      />
    </JourneyLayout>
  );
}
