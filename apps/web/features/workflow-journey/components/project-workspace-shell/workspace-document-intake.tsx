'use client';

import { useCallback, useRef, useState } from 'react';
import { ClipboardPaste, FileText, Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  isSmartIntakeContentValid,
  readSmartIntakeFile,
} from '../../lib/v2-smart-intake-engine';
import { isWorkspaceDocumentAnalyzable } from '../../lib/business-understanding/workspace-document-eligibility';

type WorkspaceDocumentIntakeProps = {
  onSubmit: (content: string) => void;
  /** S16 P0-5 — start AI conversation without a document */
  onStartWithoutDocument?: () => void;
  className?: string;
};

export function WorkspaceDocumentIntake({
  onSubmit,
  onStartWithoutDocument,
  className,
}: WorkspaceDocumentIntakeProps) {
  const t = useTranslations('workflow.journey.workspaceShell.documentIntake');
  const [pasteContent, setPasteContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = isWorkspaceDocumentAnalyzable(pasteContent);
  const hasWeakPaste = pasteContent.trim().length > 0 && !canSubmit;

  const applyFileText = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const { text } = await readSmartIntakeFile(file);
        if (!isSmartIntakeContentValid(text) && !isWorkspaceDocumentAnalyzable(text)) {
          setError(t('invalidFile'));
          setFileName(null);
          return;
        }
        setPasteContent(text);
        setFileName(file.name);
      } catch {
        setError(t('invalidFile'));
        setFileName(null);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(pasteContent.trim());
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await applyFileText(file);
    event.target.value = '';
  };

  const onDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await applyFileText(file);
  };

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] to-background px-5 py-6 sm:px-7',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('label')}</p>
      <p className="mt-3 text-xl font-semibold leading-snug tracking-tight">{t('headline')}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t('hint')}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf,.doc,.docx"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />

      <button
        type="button"
        disabled={loading}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => void onDrop(event)}
        className={cn(
          'mt-6 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragOver
            ? 'border-primary bg-primary/10'
            : 'border-primary/35 bg-primary/[0.03] hover:border-primary/50 hover:bg-primary/[0.06]',
        )}
      >
        {loading ? (
          <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        ) : (
          <Upload className="size-10 text-primary" aria-hidden />
        )}
        <p className="mt-4 text-base font-semibold">{t('uploadPrimary')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('uploadFormats')}</p>
        {fileName ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-background/80 px-3 py-1.5 text-sm font-medium">
            <FileText className="size-4 text-primary" aria-hidden />
            {fileName}
          </p>
        ) : null}
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <p className="relative mx-auto w-fit bg-background px-3 text-xs uppercase tracking-widest text-muted-foreground">
          {t('orPaste')}
        </p>
      </div>

      <label htmlFor="workspace-doc-paste" className="block space-y-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <ClipboardPaste className="size-4" aria-hidden />
          {t('pasteLabel')}
        </span>
        <textarea
          id="workspace-doc-paste"
          value={pasteContent}
          onChange={(event) => {
            setPasteContent(event.target.value);
            if (event.target.value.trim()) setFileName(null);
          }}
          rows={6}
          placeholder={t('pastePlaceholder')}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none ring-primary/30 focus:ring-2"
        />
      </label>

      <Button
        type="button"
        className="mt-6 w-full rounded-xl sm:w-auto"
        size="lg"
        disabled={!canSubmit || loading}
        onClick={handleSubmit}
      >
        {t('startReadCta')}
      </Button>

      {onStartWithoutDocument ? (
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="text-sm text-muted-foreground">{t('startWithoutDocumentHint')}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full rounded-xl sm:w-auto"
            disabled={loading}
            onClick={onStartWithoutDocument}
          >
            {t('startWithoutDocumentCta')}
          </Button>
        </div>
      ) : null}

      {hasWeakPaste ? (
        <p className="mt-3 text-sm text-amber-800 dark:text-amber-200" role="status">
          {t('insufficientPasteHint')}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
