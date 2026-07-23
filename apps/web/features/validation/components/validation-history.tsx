import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { StartupProject, ValidationScore } from '@repo/types/validation';
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

import { ValidationDecisionBadge } from './validation-decision-badge';

type ValidationHistoryProps = {
  project: StartupProject;
  history: ValidationScore[];
};

export async function ValidationHistory({ project, history }: ValidationHistoryProps) {
  const tNav = await getTranslations('common.navLinks');
  const basePath = `/projects/${project.id}/validation`;

  return (
    <>
      <PageHeader
        title="Validation History"
        description={`Past evaluations for ${project.title}`}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={basePath}>{tNav('backToValidation')}</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>{tNav('backToProject')}</Link>
        </Button>
      </div>

      {history.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No evaluation history"
            description="Create your first validation score to start tracking decisions over time."
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Create Validation Score</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Total Score</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {new Date(entry.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{entry.totalScore}</TableCell>
                  <TableCell>
                    <ValidationDecisionBadge decision={entry.decision} />
                  </TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {entry.comment ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
