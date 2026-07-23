'use client';

import { FileText, Presentation, FileType } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

type ExecutiveExportBarProps = {
  projectId: string;
};

export function ExecutiveExportBar({ projectId }: ExecutiveExportBarProps) {
  const t = useTranslations('executive');
  const { trackEvent } = useAnalytics();

  function handleExport(format: 'pdf' | 'ppt' | 'docx') {
    trackEvent(ANALYTICS_EVENTS.exportClick, {
      project_id: projectId,
      format,
    });
  }

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card px-6 py-4">
      <p className="mr-auto text-sm font-semibold">{t('export.title')}</p>
      <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
        <FileText className="size-4" />
        {t('export.pdf')}
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('ppt')}>
        <Presentation className="size-4" />
        {t('export.ppt')}
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport('docx')}>
        <FileType className="size-4" />
        {t('export.docx')}
      </Button>
      <span className="w-full text-xs text-muted-foreground sm:w-auto">{t('export.hint')}</span>
    </section>
  );
}
