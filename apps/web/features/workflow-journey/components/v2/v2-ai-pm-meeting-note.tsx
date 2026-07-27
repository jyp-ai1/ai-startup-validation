'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import {
  type AiPmMeetingNote,
  getLatestMeetingNote,
  saveFounderMemo,
} from '../../lib/v2-ai-pm-meeting-store';

type V2AiPmMeetingNoteProps = {
  reviewCount: number;
  readOnly?: boolean;
  className?: string;
};

export function V2AiPmMeetingNote({
  reviewCount,
  readOnly = false,
  className,
}: V2AiPmMeetingNoteProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.meetingNote');
  const [note, setNote] = useState<AiPmMeetingNote | null>(null);
  const [founderMemo, setFounderMemo] = useState('');

  useEffect(() => {
    if (reviewCount < 1) return;
    const latest = getLatestMeetingNote();
    if (latest) {
      setNote(latest);
      setFounderMemo(latest.founderMemo);
    }
  }, [reviewCount]);

  if (reviewCount < 1 || !note) return null;

  const handleBlur = () => {
    if (readOnly || founderMemo === note.founderMemo) return;
    saveFounderMemo(note.id, founderMemo);
    setNote({ ...note, founderMemo });
  };

  return (
    <section id="ai-pm-meeting-note" className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
      </div>

      <article className="rounded-xl border border-border/40 bg-muted/5 font-mono text-sm leading-relaxed">
        <div className="border-b border-border/40 px-4 py-3 text-center text-xs text-muted-foreground">
          ────────────────────
        </div>
        <header className="px-4 py-3 text-center">
          <p className="font-semibold">{t('header')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{note.meetingDate}</p>
        </header>
        <div className="border-y border-border/40 px-4 py-3 text-center text-xs text-muted-foreground">
          ────────────────────
        </div>

        <div className="space-y-5 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('discussedTitle')}
            </p>
            <ul className="mt-2 space-y-1.5">
              {note.discussedKeys.map((key) => (
                <li key={key}>· {t(`discussed.${key}`)}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('decisionsTitle')}
            </p>
            <ul className="mt-2 space-y-1.5">
              {note.decisionKeys.map((key) => (
                <li key={key}>· {t(`decisions.${key}`)}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t('nextAgendaTitle')}
            </p>
            <ul className="mt-2 space-y-1.5">
              {note.nextAgendaKeys.map((key) => (
                <li key={key}>· {t(`nextAgenda.${key}`)}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border/40 px-4 py-3 text-center text-xs text-muted-foreground">
          ────────────────────
        </div>

        <div className="px-4 pb-4 pt-2">
          <label htmlFor="founder-meeting-memo" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('founderMemoTitle')}
          </label>
          <textarea
            id="founder-meeting-memo"
            rows={3}
            readOnly={readOnly}
            value={founderMemo}
            onChange={(e) => setFounderMemo(e.target.value)}
            onBlur={handleBlur}
            placeholder={t('founderMemoPlaceholder')}
            className="mt-2 w-full resize-none rounded-lg border border-dashed border-border/60 bg-background px-3 py-2.5 font-sans text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
      </article>
    </section>
  );
}
