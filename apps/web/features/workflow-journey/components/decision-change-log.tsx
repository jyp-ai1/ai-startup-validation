'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { History, Redo2, Undo2 } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type ChangeEntry = {
  id: string;
  label: string;
  at: string;
  field: string;
};

const INITIAL_LOG: ChangeEntry[] = [
  { id: '1', label: 'HOLD 판정 확정', at: '2026-07-23T09:12:00', field: 'verdict' },
  { id: '2', label: 'Confidence 62% → 68%', at: '2026-07-23T11:40:00', field: 'confidence' },
  { id: '3', label: 'VOC Evidence 추가', at: '2026-07-24T14:05:00', field: 'evidence' },
];

type DecisionChangeLogProps = {
  className?: string;
};

export function DecisionChangeLog({ className }: DecisionChangeLogProps) {
  const t = useTranslations('workflow.decisionDetail.changeLog');
  const [cursor, setCursor] = useState(INITIAL_LOG.length);
  const [undoStack, setUndoStack] = useState<ChangeEntry[]>([]);

  const visible = useMemo(() => INITIAL_LOG.slice(0, cursor), [cursor]);

  function handleUndo() {
    if (cursor <= 0) return;
    const entry = INITIAL_LOG[cursor - 1]!;
    setUndoStack((prev) => [entry, ...prev]);
    setCursor((c) => c - 1);
  }

  function handleRedo() {
    if (undoStack.length === 0) return;
    const [entry, ...rest] = undoStack;
    if (!entry) return;
    setUndoStack(rest);
    setCursor((c) => Math.min(INITIAL_LOG.length, c + 1));
  }

  return (
    <section className={cn('rounded-2xl border border-border/70 bg-card p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <History className="size-3.5" aria-hidden />
            {t('eyebrow')}
          </p>
          <h3 className="mt-2 text-base font-semibold">{t('title')}</h3>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={cursor <= 0}
            aria-label={t('undo')}
          >
            <Undo2 className="size-4" aria-hidden />
            {t('undo')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRedo}
            disabled={undoStack.length === 0}
            aria-label={t('redo')}
          >
            <Redo2 className="size-4" aria-hidden />
            {t('redo')}
          </Button>
        </div>
      </div>

      <ol className="mt-4 space-y-2" role="list">
        {visible.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
            {t('empty')}
          </li>
        ) : (
          visible.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
            >
              <span>{entry.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(entry.at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
