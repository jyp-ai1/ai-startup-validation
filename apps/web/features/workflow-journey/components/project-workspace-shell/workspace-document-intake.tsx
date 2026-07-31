'use client';

import { useRef, useState } from 'react';
import { ClipboardPaste, Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  isSmartIntakeContentValid,
  readSmartIntakeFile,
} from '../../lib/v2-smart-intake-engine';

type WorkspaceDocumentIntakeProps = {
  onSubmit: (content: string) => void;
  className?: string;
};

export function WorkspaceDocumentIntake({ onSubmit, className }: WorkspaceDocumentIntakeProps) {
  const t = useTranslations('workflow.journey.workspaceShell.documentIntake');
  const [pasteContent, setPasteContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = isSmartIntakeContentValid(pasteContent);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(pasteContent.trim());
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const { text } = await readSmartIntakeFile(file);
      if (!isSmartIntakeContentValid(text)) {
        setError(t('invalidFile'));
        return;
      }
      setPasteContent(text);
    } catch {
      setError(t('invalidFile'));
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-6 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('label')}</p>
      <p className="mt-3 text-[15px] font-medium leading-relaxed">{t('title')}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t('hint')}</p>

      <label htmlFor="workspace-doc-paste" className="mt-5 block space-y-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <ClipboardPaste className="size-4" aria-hidden />
          {t('pasteLabel')}
        </span>
        <textarea
          id="workspace-doc-paste"
          value={pasteContent}
          onChange={(event) => setPasteContent(event.target.value)}
          rows={8}
          placeholder={t('pastePlaceholder')}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf,.doc,.docx"
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
        >
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="mr-2 size-4" aria-hidden />
          )}
          {t('uploadCta')}
        </Button>
        <Button type="button" className="rounded-xl" disabled={!canSubmit} onClick={handleSubmit}>
          {t('startReadCta')}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
