'use client';

import { useTranslations } from 'next-intl';

import type { V2ValidationEvidence } from '../../lib/v2-validation-store';
import {
  REVIEW_CONFIRMED_MOCK_KEYS,
  UNDERSTANDING_FIELDS,
  countStrongFields,
  getEvidenceValue,
  listMissingFields,
  strengthForField,
} from '../../lib/v2-review-board';

function strengthGlyph(strength: 'strong' | 'partial' | 'none'): string {
  if (strength === 'strong') return '🟢';
  if (strength === 'partial') return '🟡';
  return '⚪';
}

function checkGlyph(filled: boolean): string {
  return filled ? '✔' : '○';
}

type V2ReviewUnderstandingPanelProps = {
  evidence: V2ValidationEvidence;
  showMissing?: boolean;
};

export function V2ReviewUnderstandingPanel({
  evidence,
  showMissing = true,
}: V2ReviewUnderstandingPanelProps) {
  const t = useTranslations('workflow.v2.reviewBoard');
  const missing = listMissingFields(evidence);
  const strongCount = countStrongFields(evidence);

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
      <h2 className="text-sm font-semibold tracking-tight">{t('understandingTitle')}</h2>
      <div className="mt-3 border-t border-border/60" />

      <ul className="mt-4 space-y-4">
        {UNDERSTANDING_FIELDS.map((field) => {
          const value = getEvidenceValue(field, evidence);
          const filled = value != null;
          return (
            <li key={field}>
              <p className="text-sm font-medium">
                <span className="mr-1.5" aria-hidden>
                  {checkGlyph(filled)}
                </span>
                {t(`fields.${field}`)}
              </p>
              <p className="mt-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                {value ? `"${value}"` : t('emptyField')}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('strengthTitle')}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {UNDERSTANDING_FIELDS.map((field) => (
            <span key={field} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden>{strengthGlyph(strengthForField(field, evidence))}</span>
              {t(`fields.${field}`)}
            </span>
          ))}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary/70 transition-all"
            style={{ width: `${(strongCount / UNDERSTANDING_FIELDS.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('strengthCount', { filled: strongCount, total: UNDERSTANDING_FIELDS.length })}
        </p>
      </div>

      {showMissing && missing.length > 0 ? (
        <div className="mt-6 border-t border-border/60 pt-4">
          <p className="text-sm font-medium">{t('missingTitle')}</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground" role="list">
            {missing.map((field) => (
              <li key={field}>· {t(`fields.${field}`)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

type V2ReviewStatusPanelProps = {
  evidence: V2ValidationEvidence;
  phase: 'beforeReview' | 'afterReview';
};

export function V2ReviewStatusPanel({ evidence, phase }: V2ReviewStatusPanelProps) {
  const t = useTranslations('workflow.v2.reviewBoard');
  const filled = countStrongFields(evidence);

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-5">
      <p className="text-sm font-medium">{t('statusTitle')}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {phase === 'beforeReview'
          ? t('statusBeforeReview', { filled, total: UNDERSTANDING_FIELDS.length })
          : t('statusAfterReview')}
      </p>
      {phase === 'afterReview' ? (
        <p className="mt-2 text-xs text-muted-foreground">{t('stageLabel')}</p>
      ) : null}
    </div>
  );
}

export function V2ReviewConfirmedPanel() {
  const t = useTranslations('workflow.v2.reviewBoard');

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-6">
      <h2 className="text-lg font-semibold">{t('confirmedTitle')}</h2>
      <div className="mt-4 border-t border-border/60 pt-4">
        <ul className="space-y-3 text-sm leading-relaxed" role="list">
          {REVIEW_CONFIRMED_MOCK_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-2">
              <span className="text-primary" aria-hidden>
                ✔
              </span>
              {t(`confirmed.${key}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function V2ReviewJudgmentPanel({ judgmentKey }: { judgmentKey: string }) {
  const t = useTranslations('workflow.v2.reviewBoard');

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="text-sm font-semibold">{t('judgmentTitle')}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t(`judgment.${judgmentKey}`)}
      </p>
    </div>
  );
}

export function V2ReviewNextStepsPanel({
  missingFieldKeys,
  onAddMore,
}: {
  missingFieldKeys: string[];
  onAddMore?: () => void;
}) {
  const t = useTranslations('workflow.v2.reviewBoard');

  if (missingFieldKeys.length === 0) return null;

  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-5">
      <p className="text-sm font-medium">{t('nextTitle')}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground" role="list">
        {missingFieldKeys.map((field) => (
          <li key={field}>□ {t(`fields.${field}`)}</li>
        ))}
      </ul>
      {onAddMore ? (
        <button
          type="button"
          onClick={onAddMore}
          className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('nextCta')}
        </button>
      ) : null}
    </div>
  );
}
