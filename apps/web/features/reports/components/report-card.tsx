import Link from 'next/link';

import type { ValidationReport } from '@repo/types/validation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui';

import { ReportStatusBadge } from './report-status-badge';

type ReportCardProps = {
  projectId: string;
  report: ValidationReport;
};

export function ReportCard({ projectId, report }: ReportCardProps) {
  const createdDate = new Date(report.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/projects/${projectId}/reports/${report.id}`}>
      <Card className="transition-colors hover:bg-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{report.title}</CardTitle>
            <ReportStatusBadge status={report.status} />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Created {createdDate}</p>
          {report.summary ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {report.summary}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
