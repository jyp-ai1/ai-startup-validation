import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { StartupProject, ValidationReport } from '@repo/types/validation';
import { Button, EmptyState, PageHeader } from '@repo/ui';

import { ReportCard } from './report-card';

type ReportListProps = {
  project: StartupProject;
  reports: ValidationReport[];
};

export function ReportList({ project, reports }: ReportListProps) {
  const basePath = `/projects/${project.id}/reports`;

  return (
    <>
      <PageHeader
        title="Validation Reports"
        description={`Structured reports for ${project.title}`}
        actions={
          <Button asChild>
            <Link href={`${basePath}/new`}>
              <Plus className="size-4" />
              New Report
            </Link>
          </Button>
        }
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>

      {reports.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No reports yet"
            description="Create a validation report to organize your research, evidence, and GO / NO GO results."
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Create Report</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <ReportCard key={report.id} projectId={project.id} report={report} />
          ))}
        </div>
      )}
    </>
  );
}
