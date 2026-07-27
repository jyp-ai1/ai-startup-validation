'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle, Send } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { EvidenceQaPreset } from '../../lib/v2-evidence-mock-data';

type V2EvidenceQaBlockProps = {
  presets: EvidenceQaPreset[];
  readOnly?: boolean;
  className?: string;
};

export function V2EvidenceQaBlock({ presets, readOnly = false, className }: V2EvidenceQaBlockProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.evidenceDrawer.qa');
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');

  const activeAnswer =
    presets.find((p) => p.question === activeQuestion)?.answer ??
    (customQuestion.trim().length > 4 ? presets[0]?.answer : null);

  return (
    <section className={cn('space-y-4 border-t border-border/40 pt-5', className)}>
      <div className="flex items-center gap-2">
        <MessageCircle className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">{t('title')}</h3>
      </div>
      <p className="text-xs text-muted-foreground">{t('hint')}</p>

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.question}
              type="button"
              onClick={() => {
                setActiveQuestion(preset.question);
                setCustomQuestion('');
              }}
              className={cn(
                'rounded-full border px-3 py-1.5 text-left text-xs transition-colors',
                activeQuestion === preset.question
                  ? 'border-primary/40 bg-primary/10 text-foreground'
                  : 'border-border/60 text-muted-foreground hover:border-primary/30',
              )}
            >
              {preset.question}
            </button>
          ))}
        </div>
      ) : null}

      {!readOnly ? (
        <div className="flex gap-2">
          <input
            value={customQuestion}
            onChange={(e) => {
              setCustomQuestion(e.target.value);
              setActiveQuestion(null);
            }}
            placeholder={t('placeholder')}
            className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="shrink-0 rounded-lg"
            disabled={customQuestion.trim().length < 4 && !activeQuestion}
            onClick={() => {
              if (!activeQuestion && customQuestion.trim()) setActiveQuestion(customQuestion.trim());
            }}
          >
            <Send className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}

      {activeAnswer && (activeQuestion || customQuestion.trim().length > 4) ? (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t('aiLabel')}</p>
          <p className="mt-2 text-sm leading-relaxed">{activeAnswer}</p>
        </div>
      ) : null}
    </section>
  );
}
