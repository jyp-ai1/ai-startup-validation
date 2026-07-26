'use client';

import { useMemo, useState } from 'react';
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
import { computeValidationAccuracy } from '../../lib/founder-validation-accuracy';

type FounderInformationBuilderProps = {
  onUpdated?: () => void;
  className?: string;
};

const FIELD_PRIORITY: FounderInformationField[] = [
  'customer',
  'problem',
  'mvp',
  'pricing',
  'advantage',
  'progress',
];

const CUSTOMER_QUICK_OPTIONS = [
  { id: 'office', value: '직장인' },
  { id: 'selfEmployed', value: '자영업' },
  { id: 'enterprise', value: '기업' },
  { id: 'unknown', value: '아직 모르겠습니다' },
] as const;

export function FounderInformationBuilder({
  onUpdated,
  className,
}: FounderInformationBuilderProps) {
  const t = useTranslations('workflow.founderAiPm.informationBuilder');
  const [saved, setSaved] = useState(loadFounderInformation());
  const [activeField, setActiveField] = useState<FounderInformationField | null>(null);
  const [draft, setDraft] = useState('');

  const accuracy = useMemo(() => computeValidationAccuracy(), [saved]);

  const nextField = useMemo(
    () => FIELD_PRIORITY.find((field) => !saved[field]?.trim()) ?? null,
    [saved],
  );

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

  const handleQuickCustomer = (value: string) => {
    saveFounderInformationField('customer', value);
    setSaved(loadFounderInformation());
    onUpdated?.();
  };

  const showingQuestion = activeField ?? nextField;

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        {t('aiPmLabel')}
      </p>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{t('lead')}</p>
      <p className="mt-3 text-base font-semibold text-primary">{t('optionalTag')}</p>

      {showingQuestion === 'customer' && !saved.customer?.trim() && !activeField ? (
        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed">{t('proactiveCustomerLead')}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {CUSTOMER_QUICK_OPTIONS.map((option) => (
              <Button
                key={option.id}
                type="button"
                variant="outline"
                className="h-auto min-h-11 justify-start whitespace-normal rounded-xl px-3 py-2 text-left text-sm"
                onClick={() => handleQuickCustomer(option.value)}
              >
                ○ {option.value}
              </Button>
            ))}
          </div>
        </div>
      ) : showingQuestion ? (
        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed">
            {t('singleQuestionLead', { field: t(`fields.${showingQuestion}`) })}
          </p>
          <p className="mt-2 text-sm font-medium">{t(`prompts.${showingQuestion}`)}</p>
          {showingQuestion === 'problem' || showingQuestion === 'advantage' ? (
            <Textarea
              value={activeField === showingQuestion ? draft : saved[showingQuestion] ?? ''}
              onChange={(e) => {
                setActiveField(showingQuestion);
                setDraft(e.target.value);
              }}
              placeholder={t('placeholder')}
              className="mt-3 min-h-20 rounded-xl"
            />
          ) : (
            <Input
              value={activeField === showingQuestion ? draft : saved[showingQuestion] ?? ''}
              onChange={(e) => {
                setActiveField(showingQuestion);
                setDraft(e.target.value);
              }}
              placeholder={t('placeholder')}
              className="mt-3 h-11 rounded-xl"
            />
          )}
          {activeField === showingQuestion ? (
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
                onClick={() => {
                  setActiveField(null);
                  setDraft('');
                }}
              >
                {t('cancelCta')}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3 rounded-lg"
              onClick={() => openField(showingQuestion)}
            >
              {t('answerCta')}
            </Button>
          )}
        </div>
      ) : null}

      <div className="mt-5 rounded-xl border border-border/60 bg-muted/10 p-4">
        <p className="text-sm text-muted-foreground">{t('boostLead')}</p>
        <ul className="mt-3 space-y-2" role="list">
          {accuracy.gaps.map((gap) => (
            <li key={gap.key} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {gap.filled ? '✓' : '○'} {t(`fields.${gap.key}`)}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {t('boost', { value: gap.boost })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
