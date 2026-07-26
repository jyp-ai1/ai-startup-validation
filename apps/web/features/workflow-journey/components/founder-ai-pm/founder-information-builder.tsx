'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button, Input, Textarea } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  clearFounderInformationField,
  loadFounderInformation,
  saveFounderInformationField,
  type FounderInformationField,
} from '../../lib/founder-information-store';

type FounderInformationBuilderProps = {
  onUpdated?: () => void;
  className?: string;
};

const FIELD_KEYS: FounderInformationField[] = [
  'problem',
  'customer',
  'mvp',
  'progress',
  'advantage',
  'pricing',
];

export function FounderInformationBuilder({
  onUpdated,
  className,
}: FounderInformationBuilderProps) {
  const t = useTranslations('workflow.founderAiPm.informationBuilder');
  const [saved, setSaved] = useState(loadFounderInformation());
  const [activeField, setActiveField] = useState<FounderInformationField | null>(null);
  const [draft, setDraft] = useState('');

  const openField = (field: FounderInformationField) => {
    setActiveField(field);
    setDraft(saved[field] ?? '');
  };

  const handleSave = () => {
    if (!activeField) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      clearFounderInformationField(activeField);
    } else {
      saveFounderInformationField(activeField, trimmed);
    }
    setSaved(loadFounderInformation());
    setActiveField(null);
    setDraft('');
    onUpdated?.();
  };

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        {t('aiPmLabel')}
      </p>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{t('lead')}</p>
      <p className="mt-2 text-xs text-muted-foreground">{t('optionalTag')}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FIELD_KEYS.map((field) => {
          const filled = Boolean(saved[field]?.trim());
          return (
            <button
              key={field}
              type="button"
              onClick={() => openField(field)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                filled
                  ? 'border-emerald-400/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                  : 'border-border/70 hover:border-primary/40',
              )}
            >
              {filled ? '✓ ' : '○ '}
              {t(`fields.${field}`)}
            </button>
          );
        })}
      </div>

      {activeField ? (
        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
          <p className="text-sm font-medium">{t(`prompts.${activeField}`)}</p>
          {activeField === 'problem' || activeField === 'advantage' ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('placeholder')}
              className="mt-3 min-h-20 rounded-xl"
              autoFocus
            />
          ) : (
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('placeholder')}
              className="mt-3 h-11 rounded-xl"
              autoFocus
            />
          )}
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" className="rounded-lg" onClick={handleSave}>
              <PlusCircle className="mr-1.5 size-4" aria-hidden />
              {t('saveCta')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-lg"
              onClick={() => setActiveField(null)}
            >
              {t('cancelCta')}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
