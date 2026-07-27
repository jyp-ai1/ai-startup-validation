'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

import { appToast, Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  type V2EvidenceField,
  type V2ValidationEvidence,
  isEvidenceFieldFilled,
  loadV2Validation,
  saveV2Validation,
} from '../../lib/v2-validation-store';
import { countStrongFields } from '../../lib/v2-review-board';
import { JourneyLayout } from '../journey-layout';
import { V2FieldAiDialog } from './v2-field-ai-dialog';
import { V2ReviewMeetingBoard } from './v2-review-meeting-board';

const CARD = 'rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/40';

type WorkspacePhase = 'compose' | 'reviewing' | 'board' | 'followUp';

const OPTIONAL_CHIP_FIELDS: V2EvidenceField[] = ['problem', 'customer', 'mvp', 'pricing'];

const REVIEW_MS = 3200;

export function V2StrategyWorkspaceView() {
  const t = useTranslations('workflow.v2.strategyWorkspace');
  const tv = useTranslations('workflow.v2.validation');
  const tb = useTranslations('workflow.v2.reviewBoard');

  const boardRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<WorkspacePhase>('compose');
  const [idea, setIdea] = useState('');
  const [optional, setOptional] = useState<Record<V2EvidenceField, string>>({
    problem: '',
    customer: '',
    mvp: '',
    pricing: '',
  });
  const [activeField, setActiveField] = useState<V2EvidenceField | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [followUpDone, setFollowUpDone] = useState(false);

  useEffect(() => {
    const saved = loadV2Validation();
    if (!saved) return;
    setIdea(saved.evidence.idea);
    setOptional({
      problem: saved.evidence.problem ?? '',
      customer: saved.evidence.customer ?? '',
      mvp: saved.evidence.mvp ?? '',
      pricing: saved.evidence.pricing ?? '',
    });
  }, []);

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
  const filledCount = countStrongFields(evidence);

  const missingChips = OPTIONAL_CHIP_FIELDS.filter(
    (field) => !isEvidenceFieldFilled(field, evidence),
  );

  const persist = useCallback((next: V2ValidationEvidence) => {
    saveV2Validation(next);
  }, []);

  const handleFieldConfirm = (field: V2EvidenceField, value: string) => {
    setOptional((prev) => {
      const next = { ...prev, [field]: value };
      persist({
        ...evidence,
        [field]: value,
      });
      return next;
    });
    setActiveField(null);
    appToast.success(tb('toast.saved', { field: tb(`fields.${field}`) }));
  };

  const runReview = useCallback(() => {
    if (!hasIdea) return;
    persist(evidence);
    setPhase('reviewing');
    setReviewCount((c) => c + 1);

    window.setTimeout(() => {
      setPhase('board');
      window.setTimeout(() => {
        boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => setPhase('followUp'), 600);
      }, 400);
    }, REVIEW_MS);
  }, [evidence, hasIdea, persist]);

  const handleFollowUpSubmit = () => {
    const trimmed = followUpAnswer.trim();
    if (trimmed.length < 2) return;
    const enriched = optional.customer.trim()
      ? `${optional.customer}\n\n[결제 주체] ${trimmed}`
      : trimmed;
    setOptional((prev) => ({ ...prev, customer: enriched }));
    persist({ ...evidence, customer: enriched });
    setFollowUpDone(true);
    setFollowUpAnswer('');
    appToast.success(t('followUp.saved'));
    window.setTimeout(
      () => boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      300,
    );
  };

  const showMainContent = phase !== 'reviewing' && activeField == null;
  const showReviewCta = showMainContent;

  return (
    <JourneyLayout phase="workflow" width="default" versionLabel="V2">
      <div className="mx-auto w-full max-w-xl space-y-10 pb-16">
        {/* Reviewing — one thought only */}
        {phase === 'reviewing' ? (
          <section
            className={cn(
              CARD,
              'flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-300',
            )}
          >
            <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
            <p className="mt-4 text-sm font-medium">{t('reviewing.title')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('reviewing.hint')}</p>
          </section>
        ) : null}

        {/* AI PM field dialog — one thought only */}
        {activeField && phase !== 'reviewing' ? (
          <V2FieldAiDialog
            field={activeField}
            initialValue={optional[activeField]}
            onConfirm={(value) => handleFieldConfirm(activeField, value)}
            onClose={() => setActiveField(null)}
          />
        ) : null}

        {/* Compose + understanding */}
        {showMainContent ? (
          <>
            <section className="space-y-3 animate-in fade-in duration-300">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tb('step.idea')}
              </p>
              <h1 className="text-lg font-semibold tracking-tight">{tv('ideaLabel')}</h1>
              <textarea
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder={tv('ideaPlaceholder')}
                rows={3}
                className="w-full resize-none rounded-xl bg-muted/30 px-4 py-3.5 text-[15px] leading-relaxed outline-none ring-1 ring-border/50 transition-shadow focus:bg-background focus:ring-primary/30"
              />
            </section>

            <section className={cn(CARD, 'transition-all duration-300')}>
              <h2 className="text-sm font-semibold tracking-tight">{tb('understandingTitle')}</h2>

              {hasIdea ? (
                <div className="mt-4 border-t border-border/50 pt-4">
                  <p className="text-xs text-muted-foreground">{tb('fields.idea')}</p>
                  <p className="mt-1 text-sm leading-relaxed">{evidence.idea}</p>
                </div>
              ) : null}

              {OPTIONAL_CHIP_FIELDS.filter((f) => isEvidenceFieldFilled(f, evidence)).map(
                (field) => (
                  <div key={field} className="mt-4 border-t border-border/50 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{tb(`fields.${field}`)}</p>
                        <p className="mt-1 text-sm leading-relaxed">{optional[field]}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveField(field)}
                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {tb('editCta')}
                      </button>
                    </div>
                  </div>
                ),
              )}

              {missingChips.length > 0 ? (
                <div className="mt-6 border-t border-border/50 pt-5">
                  <p className="text-sm text-muted-foreground">{t('addPrompt')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingChips.map((field) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => setActiveField(field)}
                        className="rounded-full bg-muted/50 px-3.5 py-1.5 text-sm text-foreground/90 transition-colors hover:bg-muted"
                      >
                        {t(`addChips.${field}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        {/* CTA */}
        {showReviewCta ? (
          <section className="space-y-3">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-xl text-[15px] font-medium"
              disabled={!hasIdea}
              onClick={runReview}
            >
              {reviewCount > 0 ? t('reviewAgainCta') : tv('reviewStartCta')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {tb('ctaHint', { count: filledCount })}
            </p>
          </section>
        ) : null}

        {/* Judgment snippet when board visible */}
        {(phase === 'board' || phase === 'followUp') && reviewCount > 0 ? (
          <section className={cn(CARD, 'animate-in fade-in slide-in-from-bottom-2 duration-500')}>
            <h2 className="text-sm font-semibold">{tb('judgmentTitle')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {tb('judgment.ideaOnly')}
            </p>
          </section>
        ) : null}

        {/* Meeting board */}
        {(phase === 'board' || phase === 'followUp') && reviewCount > 0 ? (
          <div ref={boardRef}>
            <V2ReviewMeetingBoard
              evidence={evidence}
              reviewCount={reviewCount}
              onAddField={(field) => setActiveField(field)}
            />
          </div>
        ) : null}

        {/* Follow-up question — loop starts here */}
        {phase === 'followUp' && reviewCount > 0 && !followUpDone ? (
          <section
            className={cn(
              CARD,
              'space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150',
            )}
          >
            <p className="text-sm leading-relaxed text-muted-foreground">{t('followUp.lead')}</p>
            <p className="text-sm font-medium leading-relaxed">{t('followUp.question')}</p>
            <textarea
              value={followUpAnswer}
              onChange={(event) => setFollowUpAnswer(event.target.value)}
              rows={2}
              placeholder={t('followUp.placeholder')}
              className="w-full resize-none rounded-xl bg-muted/30 px-4 py-3 text-sm outline-none ring-1 ring-border/50 focus:ring-primary/30"
            />
            <Button
              type="button"
              size="sm"
              className="rounded-lg"
              disabled={followUpAnswer.trim().length < 2}
              onClick={handleFollowUpSubmit}
            >
              {t('followUp.submit')}
            </Button>
          </section>
        ) : null}

        {followUpDone ? (
          <p className="text-center text-sm text-muted-foreground animate-in fade-in duration-300">
            {t('followUp.done')}
          </p>
        ) : null}
      </div>
    </JourneyLayout>
  );
}
