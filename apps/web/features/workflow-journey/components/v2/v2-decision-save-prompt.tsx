'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { DecisionMemoryDraft } from '../../lib/v2-decision-memory-store';

type V2DecisionSavePromptProps = {
  draft: DecisionMemoryDraft;
  evidenceLabels: Record<string, string>;
  reasonLabels: Record<string, string>;
  onSave: () => void;
  onLater: () => void;
  className?: string;
};

export function V2DecisionSavePrompt({
  draft,
  evidenceLabels,
  reasonLabels,
  onSave,
  onLater,
  className,
}: V2DecisionSavePromptProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.decisionMemory.savePrompt');

  const reasonText =
    draft.reason === 'initialReview'
      ? reasonLabels.initialReview
      : draft.reason
          .split('+')
          .map((key) => reasonLabels[key] ?? key)
          .join('\n');

  return (
    <section
      className={cn(
        'rounded-2xl bg-primary/[0.04] p-6 ring-1 ring-primary/10 animate-in fade-in duration-300',
        className,
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{t('aiLabel')}</p>
      <p className="mt-2 text-sm leading-relaxed">{t('lead')}</p>

      <div className="mt-5 space-y-3 rounded-xl bg-background/80 p-4 ring-1 ring-border/40">
        <div>
          <p className="text-xs text-muted-foreground">{t('previewDecision')}</p>
          <p className="mt-1 text-sm font-medium">{draft.decision}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t('previewReason')}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{reasonText}</p>
        </div>
        {draft.evidence.length > 0 ? (
          <div>
            <p className="text-xs text-muted-foreground">{t('previewEvidence')}</p>
            <ul className="mt-1 space-y-0.5">
              {draft.evidence.map((key) => (
                <li key={key} className="text-sm text-muted-foreground">
                  {evidenceLabels[key] ?? key}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" size="sm" className="rounded-lg" onClick={onSave}>
          {t('saveCta')}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={onLater}>
          {t('laterCta')}
        </Button>
      </div>
    </section>
  );
}
