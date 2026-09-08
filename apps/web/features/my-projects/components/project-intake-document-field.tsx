'use client';

import { useCallback, useRef, useState } from 'react';
import { FileText, Loader2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import {
  detectWorkspaceDocumentPlaceholder,
  isWorkspaceDocumentAnalyzable,
} from '@/features/workflow-journey/lib/business-understanding/workspace-document-eligibility';
import {
  readSmartIntakeFile,
  SmartIntakeFileReadError,
} from '@/features/workflow-journey/lib/v2-smart-intake-engine';

export type ProjectIntakeUploadStatus = 'idle' | 'loading' | 'ready' | 'error';

type ProjectIntakeDocumentFieldProps = {
  disabled?: boolean;
  onStatusChange?: (status: ProjectIntakeUploadStatus) => void;
};

export function ProjectIntakeDocumentField({
  disabled = false,
  onStatusChange,
}: ProjectIntakeDocumentFieldProps) {
  const t = useTranslations('myProjects.intake');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentContent, setDocumentContent] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [importSource, setImportSource] = useState('paste');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStatus = useCallback(
    (next: ProjectIntakeUploadStatus) => {
      onStatusChange?.(next);
    },
    [onStatusChange],
  );

  const applyFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      setStatus('loading');
      try {
        const { text, source, fileName: name } = await readSmartIntakeFile(file);
        if (detectWorkspaceDocumentPlaceholder(text) != null) {
          setError(t('fileReadFailed'));
          setDocumentContent('');
          setFileName(null);
          setStatus('error');
          return;
        }
        if (!isWorkspaceDocumentAnalyzable(text)) {
          setError(t('fileTooShort'));
          setDocumentContent('');
          setFileName(null);
          setStatus('error');
          return;
        }
        setDocumentContent(text);
        setFileName(name);
        setImportSource(source);
        setStatus('ready');
      } catch (error) {
        if (error instanceof SmartIntakeFileReadError && error.reason === 'unsupported') {
          setError(t('fileUnsupported'));
        } else {
          setError(t('fileReadFailed'));
        }
        setDocumentContent('');
        setFileName(null);
        setStatus('error');
      } finally {
        setLoading(false);
      }
    },
    [setStatus, t],
  );

  const clearFile = useCallback(() => {
    setDocumentContent('');
    setFileName(null);
    setImportSource('paste');
    setError(null);
    setStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [setStatus]);

  const placeholderDoc =
    documentContent.length > 0 && detectWorkspaceDocumentPlaceholder(documentContent) != null;

  return (
    <div className="space-y-2" data-testid="project-intake-upload">
      <span className="text-sm font-medium">{t('documentLabel')}</span>
      <p className="text-xs text-muted-foreground">{t('documentHint')}</p>

      <input type="hidden" name="documentContent" value={documentContent} />
      <input type="hidden" name="fileName" value={fileName ?? ''} />
      <input type="hidden" name="importSource" value={importSource} />

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf,.doc,.docx"
        className="hidden"
        disabled={disabled || loading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void applyFile(file);
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!disabled && !loading) fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (disabled || loading) return;
          const file = event.dataTransfer.files?.[0];
          if (file) void applyFile(file);
        }}
        onClick={() => {
          if (!disabled && !loading) fileInputRef.current?.click();
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border/70 bg-muted/20',
          (disabled || loading) && 'pointer-events-none opacity-60',
        )}
      >
        {loading ? (
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
        ) : fileName ? (
          <FileText className="size-6 text-primary" aria-hidden />
        ) : (
          <Upload className="size-6 text-muted-foreground" aria-hidden />
        )}
        <p className="text-sm font-medium">
          {loading ? t('uploading') : fileName ? fileName : t('uploadCta')}
        </p>
        <p className="text-xs text-muted-foreground">{t('uploadFormats')}</p>
      </div>

      {fileName ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">
            {placeholderDoc ? t('placeholderNotice') : t('uploadReady')}
          </span>
          <button
            type="button"
            className="text-primary underline-offset-2 hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              clearFile();
            }}
            disabled={disabled || loading}
          >
            {t('removeFile')}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">{t('fileReadFailedHint')}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="text-sm text-primary underline-offset-2 hover:underline"
              onClick={(event) => {
                event.stopPropagation();
                setError(null);
                setStatus('idle');
                fileInputRef.current?.click();
              }}
              disabled={disabled || loading}
            >
              {t('retryUpload')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
