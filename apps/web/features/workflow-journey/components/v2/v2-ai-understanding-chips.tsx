'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Plus, X } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { V2EvidenceField, V2ValidationEvidence } from '../../lib/v2-validation-store';
import { isEvidenceFieldFilled } from '../../lib/v2-validation-store';

type ChipField = 'idea' | V2EvidenceField;

const CHIP_FIELDS: ChipField[] = ['idea', 'problem', 'customer', 'mvp', 'pricing'];

type V2AiUnderstandingChipsProps = {
  evidence: V2ValidationEvidence;
  readOnly?: boolean;
  highlightField?: ChipField | null;
  onIdeaChange: (value: string) => void;
  onFieldConfirm: (field: V2EvidenceField, value: string) => void;
  onFieldDelete: (field: V2EvidenceField) => void;
  className?: string;
};

function getChipValue(field: ChipField, evidence: V2ValidationEvidence): string {
  if (field === 'idea') return evidence.idea.trim();
  return evidence[field]?.trim() ?? '';
}

export function V2AiUnderstandingChips({
  evidence,
  readOnly = false,
  highlightField = null,
  onIdeaChange,
  onFieldConfirm,
  onFieldDelete,
  className,
}: V2AiUnderstandingChipsProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.understanding');
  const tb = useTranslations('workflow.v2.reviewBoard');
  const [editingField, setEditingField] = useState<ChipField | null>(null);
  const [draft, setDraft] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filledFields = CHIP_FIELDS.filter((field) => isEvidenceFieldFilled(field, evidence));
  const emptyFields = CHIP_FIELDS.filter((field) => !isEvidenceFieldFilled(field, evidence));

  const startEdit = (field: ChipField) => {
    if (readOnly) return;
    setEditingField(field);
    setDraft(getChipValue(field, evidence));
    setShowAddMenu(false);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (!editingField) return;
    const trimmed = draft.trim();
    if (editingField === 'idea') {
      if (trimmed.length >= 4) onIdeaChange(trimmed);
    } else if (trimmed.length >= 2) {
      onFieldConfirm(editingField, trimmed);
    }
    setEditingField(null);
    setDraft('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setDraft('');
  };

  const handleDelete = (field: ChipField) => {
    if (readOnly || field === 'idea') return;
    onFieldDelete(field);
  };

  const fieldLabel = (field: ChipField) => {
    if (field === 'idea') return tb('step.idea');
    return tb(`fields.${field}`);
  };

  return (
    <section id="ai-understanding" className={cn('space-y-4', className)}>
      <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
      <div className="border-t border-border/40 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {filledFields.map((field) =>
            editingField === field ? (
              <input
                key={field}
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitEdit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitEdit();
                  if (event.key === 'Escape') cancelEdit();
                }}
                className="min-w-[140px] max-w-xs rounded-full bg-background px-3 py-1.5 text-sm outline-none ring-1 ring-primary/40"
                aria-label={fieldLabel(field)}
              />
            ) : (
              <span
                key={field}
                className={cn(
                  'group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-all',
                  highlightField === field
                    ? 'bg-amber-500/15 ring-2 ring-amber-500/40 motion-safe:animate-pulse'
                    : 'bg-muted/50',
                )}
              >
                <button
                  type="button"
                  onClick={() => startEdit(field)}
                  disabled={readOnly}
                  className="inline-flex items-center gap-1.5 text-left disabled:cursor-default"
                >
                  <span>{getChipValue(field, evidence)}</span>
                  {!readOnly ? (
                    <Pencil className="size-3 text-muted-foreground opacity-60 group-hover:opacity-100" aria-hidden />
                  ) : null}
                </button>
                {!readOnly && field !== 'idea' ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(field)}
                    className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={t('delete', { field: fieldLabel(field) })}
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                ) : null}
              </span>
            ),
          )}

          {!readOnly && emptyFields.length > 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddMenu((open) => !open)}
                className="inline-flex size-8 items-center justify-center rounded-full border border-dashed border-border/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                aria-label={t('add')}
              >
                <Plus className="size-4" aria-hidden />
              </button>
              {showAddMenu ? (
                <ul className="absolute left-0 top-full z-10 mt-1 min-w-[140px] rounded-lg bg-background py-1 shadow-md ring-1 ring-border/50">
                  {emptyFields.map((field) => (
                    <li key={field}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
                        onClick={() => startEdit(field)}
                      >
                        {fieldLabel(field)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {filledFields.length === 0 && readOnly ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
