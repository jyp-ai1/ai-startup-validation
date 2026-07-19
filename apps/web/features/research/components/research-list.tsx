import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { ResearchPlan, StartupProject } from '@repo/types/validation';
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

import {
  ResearchPriorityBadge,
  ResearchStatusBadge,
  ResearchTypeBadge,
} from './research-badges';

type ResearchListProps = {
  project: StartupProject;
  plans: ResearchPlan[];
};

export function ResearchList({ project, plans }: ResearchListProps) {
  const basePath = `/projects/${project.id}/research`;

  if (plans.length === 0) {
    return (
      <>
        <PageHeader
          title="Research Master Plan"
          description={`Validation research plans for ${project.title}`}
          actions={
            <Button asChild>
              <Link href={`${basePath}/new`}>
                <Plus className="size-4" />
                New Research Plan
              </Link>
            </Button>
          }
        />
        <div className="mt-4">
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href={`/projects/${project.id}`}>Back to project</Link>
          </Button>
        </div>
        <div className="mt-8">
          <EmptyState
            title="No research plans yet"
            description="Define what to investigate before running AI-powered market research."
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>Create Research Plan</Link>
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
        title="Research Master Plan"
        description={`Validation research plans for ${project.title}`}
        actions={
          <Button asChild>
            <Link href={`${basePath}/new`}>
              <Plus className="size-4" />
              New Research Plan
            </Link>
          </Button>
        }
      />
      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>
      <div className="mt-8 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <Link
                    href={`${basePath}/${plan.id}`}
                    className="font-medium hover:underline"
                  >
                    {plan.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <ResearchTypeBadge type={plan.researchType} />
                </TableCell>
                <TableCell>
                  <ResearchPriorityBadge priority={plan.priority} />
                </TableCell>
                <TableCell>
                  <ResearchStatusBadge status={plan.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
