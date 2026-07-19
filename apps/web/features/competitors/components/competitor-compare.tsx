import Link from 'next/link';

import type { CompetitorComparison, StartupProject } from '@repo/types/validation';
import type { CompetitorComparisonField } from '@repo/types/validation';
import {
  Button,
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui';

import { COMPARISON_FIELD_LABELS } from '../schemas/competitor-schema';
import { CompetitorCategoryBadge } from './competitor-badges';

type CompetitorCompareProps = {
  project: StartupProject;
  comparison: CompetitorComparison;
};

function getFieldValue(
  competitor: CompetitorComparison['competitors'][number],
  field: CompetitorComparisonField,
): string {
  const value = competitor[field];
  return value?.trim() ? value : '—';
}

export function CompetitorCompare({
  project,
  comparison,
}: CompetitorCompareProps) {
  const basePath = `/projects/${project.id}/competitors`;
  const { competitors, fields } = comparison;

  return (
    <>
      <PageHeader
        title="Competitor Comparison Matrix"
        description={`Side-by-side analysis for ${project.title}`}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={basePath}>Back to competitors</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>

      {competitors.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No competitors to compare"
            description="Add at least one competitor to build a comparison matrix."
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Add Competitor</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px] sticky left-0 bg-background">
                  항목
                </TableHead>
                {competitors.map((competitor) => (
                  <TableHead key={competitor.id} className="min-w-[200px]">
                    <Link
                      href={`${basePath}/${competitor.id}`}
                      className="font-medium hover:underline"
                    >
                      {competitor.name}
                    </Link>
                    <div className="mt-1">
                      <CompetitorCategoryBadge category={competitor.category} />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field}>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    {COMPARISON_FIELD_LABELS[field]}
                  </TableCell>
                  {competitors.map((competitor) => (
                    <TableCell key={`${competitor.id}-${field}`}>
                      <span className="whitespace-pre-wrap text-sm">
                        {getFieldValue(competitor, field)}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
