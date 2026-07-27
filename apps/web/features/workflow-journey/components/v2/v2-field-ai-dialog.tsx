'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { V2EvidenceField } from '../../lib/v2-validation-store';

type DialogStep = 'input' | 'confirm';

type V2FieldAiDialogProps = {
  field: V2EvidenceField;
  initialValue?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export function V2FieldAiDialog({
  field,
  initialValue = '',
  onConfirm,
  onClose,
}: V2FieldAiDialogProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.aiDialog');
  const [step, setStep] = useState<DialogStep>('input');
  const [draft, setDraft] = useState(initialValue);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const trimmed = draft.trim();
  const canProceed = trimmed.length >= 2;

  const handleConfirm = () => {
    onConfirm(trimmed);
    setVisible(false);
    window.setTimeout(onClose, 200);
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-border/50 transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      )}
    >
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t('aiLabel')}</p>
          <p className="mt-2 text-sm leading-relaxed">{t(`questions.${field}`)}</p>
        </div>

        {step === 'input' ? (
          <>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              autoFocus
              placeholder={t('inputPlaceholder')}
              className="w-full resize-none rounded-xl bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-1 ring-border/50 focus:ring-primary/30"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-lg"
                disabled={!canProceed}
                onClick={() => setStep('confirm')}
              >
                {t('nextCta')}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={onClose}>
                {t('cancelCta')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl bg-background px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              {t(`confirmSummary.${field}`, { value: trimmed })}
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" className="rounded-lg" onClick={handleConfirm}>
                {t('confirmCta')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => setStep('input')}
              >
                {t('reviseCta')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
