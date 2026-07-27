'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import {
  type AiPmNotebookEntry,
  getLatestNotebook,
  saveFounderMemo,
} from '../../lib/v2-ai-pm-notebook-store';

type V2AiPmNotebookProps = {
  reviewCount: number;
  readOnly?: boolean;
  className?: string;
};

export function V2AiPmNotebook({
  reviewCount,
  readOnly = false,
  className,
}: V2AiPmNotebookProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.aiPmNotebook');
  const [entry, setEntry] = useState<AiPmNotebookEntry | null>(null);
  const [founderMemo, setFounderMemo] = useState('');

  useEffect(() => {
    if (reviewCount < 1) return;
    const latest = getLatestNotebook();
    if (latest) {
      setEntry(latest);
      setFounderMemo(latest.founderMemo);
    }
  }, [reviewCount]);

  if (reviewCount < 1 || !entry) return null;

  const handleMemoBlur = () => {
    if (readOnly || founderMemo === entry.founderMemo) return;
    saveFounderMemo(entry.id, founderMemo);
    setEntry({ ...entry, founderMemo });
  };

  return (
    <section id="ai-pm-notebook" className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
      </div>

      <div className="space-y-4 rounded-xl border border-border/40 bg-muted/5 p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('learnedTitle')}
          </p>
          <ol className="mt-2 space-y-1.5 text-sm">
            {entry.aiFindings.map((key, index) => (
              <li key={key} className="flex gap-2">
                <span className="text-primary">{t('itemMarker', { n: index + 1 })}</span>
                <span>{t(`findings.${key}`)}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-t border-border/40 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('aiMemoTitle')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.aiMemo}</p>
        </div>

        <div className="border-t border-border/40 pt-4">
          <label htmlFor="founder-memo" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('founderMemoTitle')}
          </label>
          <textarea
            id="founder-memo"
            rows={3}
            readOnly={readOnly}
            value={founderMemo}
            onChange={(e) => setFounderMemo(e.target.value)}
            onBlur={handleMemoBlur}
            placeholder={t('founderMemoPlaceholder')}
            className="mt-2 w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
      </div>
    </section>
  );
}
