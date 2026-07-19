import Link from 'next/link';

import type { StartupProject, VOCSummary } from '@repo/types/validation';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui';

import { VOCSummaryCharts } from './voc-summary-charts';

type VOCSummaryViewProps = {
  project: StartupProject;
  summary: VOCSummary;
};

function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

export function VOCSummaryView({ project, summary }: VOCSummaryViewProps) {
  const basePath = `/projects/${project.id}/voc`;
  const maxPainCount = summary.painPointRanking[0]?.count ?? 0;

  if (summary.totalCount === 0) {
    return (
      <>
        <PageHeader
          title="VOC Summary Dashboard"
          description={project.title}
        />
        <div className="mt-4">
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href={basePath}>Back to VOC list</Link>
          </Button>
        </div>
        <div className="mt-8">
          <EmptyState
            title="No VOC data to summarize"
            description="Add customer feedback entries to see pain point rankings and distributions."
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Create VOC</Link>
              </Button>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="VOC Summary Dashboard"
        description={`${summary.totalCount} entries · ${project.title}`}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={basePath}>Back to VOC list</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pain Point Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.painPointRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pain points recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pain Point</TableHead>
                    <TableHead className="w-[200px]">Occurrences</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.painPointRanking.map((item) => (
                    <TableRow key={item.painPoint}>
                      <TableCell className="font-medium">{item.painPoint}</TableCell>
                      <TableCell>
                        <ProgressBar value={item.count} max={maxPainCount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <VOCSummaryCharts
          severityDistribution={summary.severityDistribution}
          frequencyDistribution={summary.frequencyDistribution}
          willingnessDistribution={summary.willingnessDistribution}
          customerSegmentDistribution={summary.customerSegmentDistribution}
        />
      </div>
    </>
  );
}
