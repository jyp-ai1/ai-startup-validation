'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { appToast, Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { V2EvidenceField, V2ValidationEvidence } from '../../lib/v2-validation-store';
import { isEvidenceFieldFilled } from '../../lib/v2-validation-store';
import {
  UNDERSTANDING_FIELDS,
  type UnderstandingFieldKey,
  countStrongFields,
  getEvidenceValue,
} from '../../lib/v2-review-board';

const CARD =
  'rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/40';

type EditableField = UnderstandingFieldKey;

type V2ReviewBoardWorkspaceProps = {
  idea: string;
  optional: Record<V2EvidenceField, string>;
  onIdeaChange: (value: string) => void;
  onOptionalChange: (field: V2EvidenceField, value: string) => void;
  onStartReview: () => void;
  reviewDisabled?: boolean;
};

export function V2ReviewBoardWorkspace({
  idea,
  optional,
  onIdeaChange,
  onOptionalChange,
  onStartReview,
  reviewDisabled = false,
}: V2ReviewBoardWorkspaceProps) {
  const t = useTranslations('workflow.v2.reviewBoard');
  const tv = useTranslations('workflow.v2.validation');
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [draft, setDraft] = useState('');

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

  const filledCount = countStrongFields(evidence);
  const hasIdea = isEvidenceFieldFilled('idea', evidence);

  const openEditor = (field: EditableField) => {
    const current =
      field === 'idea' ? idea : optional[field as V2EvidenceField] ?? '';
    setDraft(current);
    setEditingField(field);
  };

  const closeEditor = () => {
    setEditingField(null);
    setDraft('');
  };

  const handleSave = () => {
    if (!editingField) return;
    const trimmed = draft.trim();

    if (editingField === 'idea') {
      onIdeaChange(trimmed);
    } else {
      onOptionalChange(editingField, trimmed);
    }

    closeEditor();

    appToast.success(t('toast.saved', { field: t(`fields.${editingField}`) }), {
      description: t('toast.reviewAgainHint'),
      action: hasIdea
        ? { label: t('toast.reviewAgain'), onClick: onStartReview }
        : undefined,
    });
  };

  const questionFor = (field: EditableField): string => {
    if (field === 'idea') return tv('ideaPlaceholder');
    return tv(`questions.${field}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-10 pb-8">
      {/* ① 현재 해야 하는 것 */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('step.idea')}
        </p>
        <h1 className="text-lg font-semibold tracking-tight">{tv('ideaLabel')}</h1>
        <textarea
          value={idea}
          onChange={(event) => onIdeaChange(event.target.value)}
          placeholder={tv('ideaPlaceholder')}
          rows={3}
          className="w-full resize-none rounded-xl bg-muted/30 px-4 py-3.5 text-[15px] leading-relaxed outline-none ring-1 ring-border/50 transition-shadow focus:bg-background focus:ring-primary/30"
        />
      </section>

      {/* ② AI가 이해한 내용 */}
      <section className={CARD}>
        <h2 className="text-sm font-semibold tracking-tight">{t('understandingTitle')}</h2>

        <ul className="mt-5 divide-y divide-border/50">
          {UNDERSTANDING_FIELDS.map((field) => {
            const value = getEvidenceValue(field, evidence);
            const filled = value != null;
            const isOptional = field !== 'idea';
            const isEditing = editingField === field;

            return (
              <li key={field} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      <span className="mr-2 text-muted-foreground" aria-hidden>
                        {filled ? '✔' : '○'}
                      </span>
                      {t(`fields.${field}`)}
                    </p>
                    {!isEditing && filled ? (
                      <p className="mt-1.5 truncate pl-6 text-sm text-muted-foreground">
                        {value}
                      </p>
                    ) : null}
                    {!isEditing && !filled && isOptional ? (
                      <p className="mt-1 pl-6 text-sm text-muted-foreground/70">
                        {t('emptyField')}
                      </p>
                    ) : null}
                  </div>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => openEditor(field)}
                      className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {filled ? t('editCta') : t('addCta')}
                    </button>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-3 pl-6">
                    <label htmlFor={`edit-${field}`} className="sr-only">
                      {t(`fields.${field}`)}
                    </label>
                    <textarea
                      id={`edit-${field}`}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={3}
                      placeholder={questionFor(field)}
                      className="w-full resize-none rounded-xl bg-muted/30 px-4 py-3 text-sm leading-relaxed outline-none ring-1 ring-border/50 focus:bg-background focus:ring-primary/30"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-lg"
                        onClick={handleSave}
                      >
                        {t('saveCta')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="rounded-lg"
                        onClick={closeEditor}
                      >
                        {t('cancelCta')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ③ 검토 + ④ 다음 행동 */}
      <section className="space-y-3 pt-2">
        <Button
          type="button"
          size="lg"
          className="h-12 w-full rounded-xl text-[15px] font-medium"
          disabled={reviewDisabled || !hasIdea}
          onClick={onStartReview}
        >
          {tv('reviewStartCta')}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t('ctaHint', { count: filledCount })}
        </p>
        <p className="text-center text-xs text-muted-foreground/80">{t('ctaQualityHint')}</p>
      </section>
    </div>
  );
}

/** Read-only premium card for conclusion flow */
export function V2ReviewBoardReadOnly({
  evidence,
  className,
}: {
  evidence: V2ValidationEvidence;
  className?: string;
}) {
  const t = useTranslations('workflow.v2.reviewBoard');

  return (
    <section className={cn(CARD, className)}>
      <h2 className="text-sm font-semibold tracking-tight">{t('understandingTitle')}</h2>
      <ul className="mt-5 divide-y divide-border/50">
        {UNDERSTANDING_FIELDS.map((field) => {
          const value = getEvidenceValue(field, evidence);
          const filled = value != null;
          return (
            <li key={field} className="py-3.5 first:pt-0 last:pb-0">
              <p className="text-sm font-medium">
                <span className="mr-2 text-muted-foreground" aria-hidden>
                  {filled ? '✔' : '○'}
                </span>
                {t(`fields.${field}`)}
              </p>
              <p className="mt-1 pl-6 text-sm text-muted-foreground">
                {value ?? t('emptyField')}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
