'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  type WorkflowStepId,
  getStepField,
  isInputStepFilled,
} from '../../lib/v2-workflow-steps';
import type { V2EvidenceField, V2ValidationEvidence } from '../../lib/v2-validation-store';
import { countStrongFields, getEvidenceValue } from '../../lib/v2-review-board';
import { V2FieldAiDialog } from './v2-field-ai-dialog';
import { V2MeetingSummary } from './v2-meeting-summary';

type V2MainWorkspacePanelProps = {
  activeStep: WorkflowStepId;
  evidence: V2ValidationEvidence;
  idea: string;
  optional: Record<V2EvidenceField, string>;
  reviewCount: number;
  phase: 'compose' | 'reviewing' | 'board' | 'followUp';
  followUpAnswer: string;
  followUpDone: boolean;
  onIdeaChange: (value: string) => void;
  onFieldConfirm: (field: V2EvidenceField, value: string) => void;
  onFieldDelete: (field: V2EvidenceField) => void;
  onOpenField: (field: V2EvidenceField) => void;
  activeField: V2EvidenceField | null;
  onCloseField: () => void;
  onReview: () => void;
  onFollowUpChange: (value: string) => void;
  onFollowUpSubmit: () => void;
  onGoToStep: (step: WorkflowStepId) => void;
  hasIdea: boolean;
};

const PANEL = 'min-h-[420px] rounded-2xl bg-muted/20 p-6 sm:p-8 lg:min-h-[480px]';

export function V2MainWorkspacePanel({
  activeStep,
  evidence,
  idea,
  optional,
  reviewCount,
  phase,
  followUpAnswer,
  followUpDone,
  onIdeaChange,
  onFieldConfirm,
  onFieldDelete,
  onOpenField,
  activeField,
  onCloseField,
  onReview,
  onFollowUpChange,
  onFollowUpSubmit,
  onGoToStep,
  hasIdea,
}: V2MainWorkspacePanelProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.main');
  const tv = useTranslations('workflow.v2.validation');
  const tb = useTranslations('workflow.v2.reviewBoard');
  const tf = useTranslations('workflow.v2.strategyWorkspace.followUp');
  const tReview = useTranslations('workflow.v2.strategyWorkspace');

  const [deleteField, setDeleteField] = useState<V2EvidenceField | null>(null);

  if (phase === 'reviewing') {
    return (
      <section className={cn(PANEL, 'flex flex-col items-center justify-center text-center')}>
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="mt-4 text-sm font-medium">{tReview('reviewing.title')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{tReview('reviewing.hint')}</p>
      </section>
    );
  }

  if (activeField) {
    return (
      <section className={PANEL}>
        <V2FieldAiDialog
          field={activeField}
          initialValue={optional[activeField]}
          onConfirm={(value) => onFieldConfirm(activeField, value)}
          onClose={onCloseField}
        />
      </section>
    );
  }

  const renderFieldActions = (field: V2EvidenceField, value: string) => (
    <div className="mt-6 flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-lg gap-1.5"
        onClick={() => onOpenField(field)}
      >
        <Pencil className="size-3.5" aria-hidden />
        {t('actions.edit')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-lg gap-1.5"
        onClick={() => setDeleteField(field)}
      >
        <Trash2 className="size-3.5" aria-hidden />
        {t('actions.delete')}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="rounded-lg gap-1.5"
        onClick={() => onOpenField(field)}
      >
        <Plus className="size-3.5" aria-hidden />
        {t('actions.reinput')}
      </Button>
    </div>
  );

  const renderInputStep = (step: WorkflowStepId) => {
    const field = getStepField(step);
    if (!field || field === 'idea') return null;

    const filled = isInputStepFilled(step, evidence);
    const value = getEvidenceValue(field, evidence) ?? '';

    return (
      <section className={PANEL}>
        <h1 className="text-lg font-semibold tracking-tight">{tb(`fields.${field}`)}</h1>
        {filled ? (
          <>
            <p className="mt-6 text-[15px] leading-relaxed">{value}</p>
            {renderFieldActions(field, value)}
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">{t(`empty.${field}`)}</p>
            <Button
              type="button"
              size="sm"
              className="mt-6 rounded-lg"
              onClick={() => onOpenField(field)}
            >
              {t('actions.add')}
            </Button>
          </>
        )}
      </section>
    );
  };

  let content: React.ReactNode = null;

  switch (activeStep) {
    case 'idea':
      content = (
        <section className={PANEL}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {tb('step.idea')}
          </p>
          <h1 className="mt-2 text-lg font-semibold tracking-tight">{tv('ideaLabel')}</h1>
          <textarea
            value={idea}
            onChange={(event) => onIdeaChange(event.target.value)}
            placeholder={tv('ideaPlaceholder')}
            rows={4}
            className="mt-6 w-full resize-none rounded-xl bg-background px-4 py-3.5 text-[15px] leading-relaxed outline-none ring-1 ring-border/50 focus:ring-primary/30"
          />
        </section>
      );
      break;
    case 'problem':
    case 'customer':
    case 'bm':
    case 'mvp':
      content = renderInputStep(activeStep);
      break;
    case 'market':
      content = (
        <section className={PANEL}>
          <h1 className="text-lg font-semibold tracking-tight">{t('market.title')}</h1>
          {reviewCount > 0 ? (
            <dl className="mt-6 space-y-4">
              {(['size', 'growth', 'search', 'similar'] as const).map((key) => (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground">{t(`market.${key}Label`)}</dt>
                  <dd className="mt-1 text-sm leading-relaxed">{t(`market.${key}Value`)}</dd>
                </div>
              ))}
              <div className="border-t border-border/40 pt-4">
                <dt className="text-xs text-muted-foreground">{t('market.opinionLabel')}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t('market.opinionValue')}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t('market.locked')}</p>
          )}
        </section>
      );
      break;
    case 'competition':
      content = (
        <section className={PANEL}>
          <h1 className="text-lg font-semibold tracking-tight">{t('competition.title')}</h1>
          {reviewCount > 0 ? (
            <dl className="mt-6 space-y-4">
              {(['competitors', 'strength', 'weakness', 'diff'] as const).map((key) => (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground">
                    {t(`competition.${key}Label`)}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed">{t(`competition.${key}Value`)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t('competition.locked')}</p>
          )}
        </section>
      );
      break;
    case 'review':
      content = (
        <section className={PANEL}>
          <V2MeetingSummary evidence={evidence} reviewCount={reviewCount} />
          {reviewCount > 0 && !followUpDone ? (
            <div className="mt-8 space-y-4 border-t border-border/40 pt-8">
              <p className="text-sm text-muted-foreground">{tf('lead')}</p>
              <p className="text-sm font-medium">{tf('question')}</p>
              <textarea
                value={followUpAnswer}
                onChange={(event) => onFollowUpChange(event.target.value)}
                rows={2}
                placeholder={tf('placeholder')}
                className="w-full resize-none rounded-xl bg-background px-4 py-3 text-sm outline-none ring-1 ring-border/50 focus:ring-primary/30"
              />
              <Button
                type="button"
                size="sm"
                className="rounded-lg"
                disabled={followUpAnswer.trim().length < 2}
                onClick={onFollowUpSubmit}
              >
                {tf('submit')}
              </Button>
            </div>
          ) : null}
          {followUpDone ? (
            <p className="mt-8 border-t border-border/40 pt-6 text-sm text-muted-foreground">
              {tf('done')}
            </p>
          ) : null}
        </section>
      );
      break;
    default:
      content = null;
  }

  return (
    <>
      {content}

      {activeStep !== 'review' ? (
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {tb('ctaHint', { count: countStrongFields(evidence) })}
          </p>
          <Button
            type="button"
            className="rounded-xl px-6"
            disabled={!hasIdea}
            onClick={onReview}
          >
            {reviewCount > 0 ? tReview('reviewAgainCta') : tv('reviewStartCta')}
          </Button>
        </div>
      ) : null}

      {activeStep === 'review' && reviewCount > 0 ? (
        <div className="mt-6 rounded-2xl bg-primary/[0.04] p-5 ring-1 ring-primary/10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('nextAction.eyebrow')}
          </p>
          <p className="mt-2 text-sm leading-relaxed">{t('nextAction.body')}</p>
          <Button
            type="button"
            size="sm"
            className="mt-4 rounded-lg"
            onClick={() => onGoToStep('customer')}
          >
            {t('nextAction.cta')}
          </Button>
        </div>
      ) : null}

      <Dialog open={deleteField != null} onOpenChange={(open) => !open && setDeleteField(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription>{t('delete.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteField(null)}>
              {t('delete.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (deleteField) onFieldDelete(deleteField);
                setDeleteField(null);
              }}
            >
              {t('delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
