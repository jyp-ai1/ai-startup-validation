'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

import {
  approveReportAction,
  changeReportTemplateAction,
  reorderReportSectionsAction,
  resolveReviewCommentAction,
} from '../actions/report-engine-actions';
import { listTemplates } from '../template-engine/template-engine';
import type { ExecutiveReport, ReportSectionId, ReportTemplateId } from '../types/report-types';
import { ReportExportPanel } from './report-export-panel';
import { ReportReviewerPanel } from './report-reviewer-panel';
import { ReportSectionList } from './report-section-list';
import { ReportSlidePreview } from './report-slide-preview';
import { ReportVersionBadge } from './report-version-badge';

type ExecutiveReportPreviewProps = {
  report: ExecutiveReport;
  projectId: string;
};

export function ExecutiveReportPreview({ report, projectId }: ExecutiveReportPreviewProps) {
  const t = useTranslations('reportEngine');
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const [pending, startTransition] = useTransition();

  const allSections = useMemo(
    () => [...report.sections, ...report.appendix].sort((a, b) => a.order - b.order),
    [report],
  );

  const [activeId, setActiveId] = useState<ReportSectionId>(
    allSections[0]?.id ?? 'EXECUTIVE_SUMMARY',
  );
  const activeIndex = allSections.findIndex((s) => s.id === activeId);
  const activeSection = allSections[activeIndex] ?? allSections[0]!;

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.reportPreview, {
      project_id: projectId,
      report_id: report.id,
      template: report.templateId,
    });
  }, [projectId, report.id, report.templateId, trackEvent]);

  function handleReorder(orderedIds: ReportSectionId[]) {
    startTransition(async () => {
      await reorderReportSectionsAction(report.id, projectId, orderedIds);
      router.refresh();
    });
  }

  function handleTemplateChange(templateId: ReportTemplateId) {
    startTransition(async () => {
      trackEvent(ANALYTICS_EVENTS.reportTemplateChange, {
        project_id: projectId,
        template: templateId,
      });
      await changeReportTemplateAction(report.id, projectId, templateId);
      router.refresh();
    });
  }

  function handleResolve(commentId: string) {
    startTransition(async () => {
      await resolveReviewCommentAction(report.id, projectId, commentId);
      router.refresh();
    });
  }

  function handleApprove() {
    startTransition(async () => {
      await approveReportAction(report.id, projectId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('preview.eyebrow')}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{report.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(report.subtitle as 'templates.subtitles.executive')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ReportVersionBadge version={report.version} />
            <span className="text-xs text-muted-foreground">{report.author}</span>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">{t('preview.backToDashboard')}</Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {listTemplates().map((tpl) => (
          <Button
            key={tpl.id}
            size="sm"
            variant={report.templateId === tpl.id ? 'default' : 'outline'}
            disabled={pending}
            onClick={() => handleTemplateChange(tpl.id)}
          >
            {t(tpl.nameKey as 'templates.executive')}
          </Button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border/50 bg-card p-4">
          <ReportSectionList
            sections={report.sections}
            appendix={report.appendix}
            activeSectionId={activeId}
            onSelect={setActiveId}
            onReorder={handleReorder}
          />
        </aside>

        <div className="space-y-4">
          <ReportSlidePreview
            section={activeSection}
            projectTitle={report.projectTitle}
            slideIndex={activeIndex + 1}
            totalSlides={allSections.length}
          />
          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={activeIndex <= 0}
              onClick={() => setActiveId(allSections[activeIndex - 1]!.id)}
            >
              <ChevronLeft className="size-4" />
              {t('preview.prev')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={activeIndex >= allSections.length - 1}
              onClick={() => setActiveId(allSections[activeIndex + 1]!.id)}
            >
              {t('preview.next')}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportReviewerPanel
          report={report}
          onResolve={handleResolve}
          onApprove={handleApprove}
          pending={pending}
        />
        <ReportExportPanel report={report} projectId={projectId} />
      </div>
    </div>
  );
}
