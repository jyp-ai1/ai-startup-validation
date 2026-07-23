'use client';

import Link from 'next/link';
import { Eye, FileText, Presentation, FileType } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

type ExecutiveExportBarProps = {
  projectId: string;
};

export function ExecutiveExportBar({ projectId }: ExecutiveExportBarProps) {
  const t = useTranslations('executive');
  const tr = useTranslations('reportEngine');
  const { trackEvent } = useAnalytics();

  function handlePreviewClick() {
    trackEvent(ANALYTICS_EVENTS.reportGenerate, {
      project_id: projectId,
      screen: '/dashboard',
    });
  }

  function handleExportClick(format: 'pdf' | 'ppt' | 'docx') {
    trackEvent(ANALYTICS_EVENTS.exportClick, {
      project_id: projectId,
      format,
    });
    trackEvent(ANALYTICS_EVENTS.reportPreview, {
      project_id: projectId,
      source: 'dashboard_export',
    });
  }

  const previewHref = `/projects/${projectId}/executive-report`;

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card px-6 py-4">
      <p className="mr-auto text-sm font-semibold">{t('export.title')}</p>
      <Button asChild onClick={handlePreviewClick}>
        <Link href={previewHref}>
          <Eye className="size-4" />
          {tr('preview.openFromDashboard')}
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild onClick={() => handleExportClick('pdf')}>
        <Link href={previewHref}>
          <FileText className="size-4" />
          {t('export.pdf')}
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild onClick={() => handleExportClick('ppt')}>
        <Link href={previewHref}>
          <Presentation className="size-4" />
          {t('export.ppt')}
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild onClick={() => handleExportClick('docx')}>
        <Link href={previewHref}>
          <FileType className="size-4" />
          {t('export.docx')}
        </Link>
      </Button>
      <span className="w-full text-xs text-muted-foreground sm:w-auto">{tr('preview.dashboardHint')}</span>
    </section>
  );
}
