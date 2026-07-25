'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { patchProjectFields } from '../actions/project-actions';

type UseProjectAutosaveOptions = {
  projectId: string;
  enabled: boolean;
};

export function useProjectAutosave({ projectId, enabled }: UseProjectAutosaveOptions) {
  const t = useTranslations('projects.form');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const form = document.getElementById('project-form');
    if (!form) return;

    function scheduleSave() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setStatus('saving');
      timerRef.current = window.setTimeout(async () => {
        const title = (form!.querySelector('#title') as HTMLInputElement | null)?.value ?? '';
        const summary = (form!.querySelector('#summary') as HTMLTextAreaElement | null)?.value ?? '';
        const result = await patchProjectFields(projectId, { title, summary });
        setStatus(result.ok ? 'saved' : 'error');
      }, 900);
    }

    form.addEventListener('input', scheduleSave);
    return () => {
      form.removeEventListener('input', scheduleSave);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, projectId]);

  if (!enabled || status === 'idle') return null;

  return (
    <p
      className="text-xs text-muted-foreground"
      aria-live="polite"
    >
      {status === 'saving'
        ? t('autosaving')
        : status === 'saved'
          ? t('autosaved')
          : t('autosaveError')}
    </p>
  );
}
