'use client';

import { useEffect, useState, useTransition } from 'react';
import { Download, FileText, Loader2, Presentation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

import {
  getReportExportJob,
  requestReportExportAction,
} from '../actions/report-engine-actions';
import type { ExecutiveReport, ExportFormat, ExportJob } from '../types/report-types';

type ReportExportPanelProps = {
  report: ExecutiveReport;
  projectId: string;
};

const FORMATS: { format: ExportFormat; icon: React.ReactNode; labelKey: string }[] = [
  { format: 'PDF', icon: <FileText className="size-4" />, labelKey: 'export.pdf' },
  { format: 'PPTX', icon: <Presentation className="size-4" />, labelKey: 'export.pptx' },
  { format: 'DOCX', icon: <FileText className="size-4" />, labelKey: 'export.docx' },
];

export function ReportExportPanel({ report, projectId }: ReportExportPanelProps) {
  const t = useTranslations('reportEngine');
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [pending, startTransition] = useTransition();
  const [activeJob, setActiveJob] = useState<ExportJob | null>(null);

  useEffect(() => {
    if (!activeJob || activeJob.status === 'COMPLETED' || activeJob.status === 'FAILED') return;

    const interval = setInterval(async () => {
      const job = await getReportExportJob(activeJob.id);
      if (job) {
        setActiveJob(job);
        if (job.status === 'COMPLETED') {
          trackEvent(ANALYTICS_EVENTS.reportExport, {
            project_id: projectId,
            format: job.format.toLowerCase(),
            report_id: report.id,
          });
          router.refresh();
        }
      }
    }, 800);

    return () => clearInterval(interval);
  }, [activeJob, projectId, report.id, router, trackEvent]);

  function handleExport(format: ExportFormat) {
    startTransition(async () => {
      const result = await requestReportExportAction(report.id, projectId, format);
      if (result.jobId) {
        const job = await getReportExportJob(result.jobId);
        setActiveJob(job);
      }
    });
  }

  return (
    <section className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{t('export.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('export.desc')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FORMATS.map(({ format, icon, labelKey }) => (
          <Button
            key={format}
            variant="outline"
            size="sm"
            disabled={pending || activeJob?.status === 'GENERATING'}
            onClick={() => handleExport(format)}
          >
            {icon}
            {t(labelKey as 'export.pdf')}
          </Button>
        ))}
      </div>

      {activeJob ? (
        <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            {activeJob.status === 'GENERATING' || activeJob.status === 'REQUESTED' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : activeJob.status === 'COMPLETED' ? (
              <Download className="size-4 text-emerald-600" />
            ) : null}
            <span>{t(`export.status.${activeJob.status.toLowerCase()}` as 'export.status.requested')}</span>
          </div>
          {activeJob.status === 'COMPLETED' && activeJob.fileName ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('export.ready', { file: activeJob.fileName })}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
