import Link from 'next/link';

import type {
  StartupProject,
  ValidationReportWithSections,
} from '@repo/types/validation';
import { Button, PageHeader } from '@repo/ui';

import { renderMarkdown } from '../utils/markdown';
import { ReportStatusBadge } from './report-status-badge';

type ReportPreviewProps = {
  project: StartupProject;
  report: ValidationReportWithSections;
};

export function ReportPreview({ project, report }: ReportPreviewProps) {
  const basePath = `/projects/${project.id}/reports/${report.id}`;
  const createdDate = new Date(report.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <PageHeader
        title="Report Preview"
        description={report.title}
        actions={
          <Button variant="outline" asChild>
            <Link href={basePath}>Back to Editor</Link>
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ReportStatusBadge status={report.status} />
        <span className="text-sm text-muted-foreground">{project.title}</span>
        <span className="text-sm text-muted-foreground">· {createdDate}</span>
      </div>

      <article className="mx-auto mt-10 max-w-3xl">
        <header className="border-b pb-8">
          <h1 className="text-3xl font-bold tracking-tight">{report.title}</h1>
          {report.summary ? (
            <p className="mt-4 text-lg text-muted-foreground">{report.summary}</p>
          ) : null}
        </header>

        <div className="space-y-12 py-10">
          {report.sections.map((section) => (
            <section key={section.id} id={section.sectionType}>
              <h2 className="mb-4 text-2xl font-semibold">{section.title}</h2>
              {section.content.trim() ? (
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                />
              ) : (
                <p className="text-sm italic text-muted-foreground">No content.</p>
              )}
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
