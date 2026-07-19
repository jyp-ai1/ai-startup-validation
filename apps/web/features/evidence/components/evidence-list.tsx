import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { Evidence, StartupProject } from '@repo/types/validation';
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

import type { EvidenceFilterParams } from '../schemas/evidence-schema';
import {
  EvidenceCategoryBadge,
  EvidenceConfidenceBadge,
  EvidenceSourceBadge,
} from './evidence-badges';
import { EvidenceFilters } from './evidence-filters';

type EvidenceListProps = {
  project: StartupProject;
  evidenceList: Evidence[];
  filters: EvidenceFilterParams;
};

export function EvidenceList({
  project,
  evidenceList,
  filters,
}: EvidenceListProps) {
  const basePath = `/projects/${project.id}/evidence`;

  return (
    <>
      <PageHeader
        title="Evidence Database"
        description={`Validation evidence for ${project.title}`}
        actions={
          <Button asChild>
            <Link href={`${basePath}/new`}>
              <Plus className="size-4" />
              New Evidence
            </Link>
          </Button>
        }
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}/research`}>Research Plans</Link>
        </Button>
      </div>

      <div className="mt-6">
        <EvidenceFilters projectId={project.id} current={filters} />
      </div>

      {evidenceList.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No evidence found"
            description={
              filters.category || filters.sourceType || filters.confidence
                ? 'Try adjusting your filters or add new evidence.'
                : 'Register market data, reports, and references to support validation decisions.'
            }
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Create Evidence</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidenceList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`${basePath}/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <EvidenceCategoryBadge category={item.category} />
                  </TableCell>
                  <TableCell>
                    <EvidenceSourceBadge
                      sourceType={item.sourceType}
                      sourceName={item.sourceName}
                    />
                  </TableCell>
                  <TableCell>
                    <EvidenceConfidenceBadge confidence={item.confidence} />
                  </TableCell>
                  <TableCell>
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
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
