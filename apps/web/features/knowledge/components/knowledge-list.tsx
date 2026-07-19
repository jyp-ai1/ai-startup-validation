import Link from 'next/link';
import { Search } from 'lucide-react';

import type { KnowledgeDocument, StartupProject } from '@repo/types/validation';
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

import { KnowledgeProcessButton } from './knowledge-process-button';
import { KnowledgeSourceBadge, KnowledgeStatusBadge } from './knowledge-badges';

type KnowledgeListProps = {
  project: StartupProject;
  documents: KnowledgeDocument[];
};

export function KnowledgeList({ project, documents }: KnowledgeListProps) {
  const basePath = `/projects/${project.id}/knowledge`;

  return (
    <>
      <PageHeader
        title="Knowledge Base"
        description={`Evidence intelligence for ${project.title}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <KnowledgeProcessButton projectId={project.id} />
            <Button variant="outline" asChild>
              <Link href={`${basePath}/query`}>
                <Search className="size-4" />
                AI Query
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mt-4">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>Back to project</Link>
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No knowledge documents yet"
            description="Process Evidence into searchable knowledge chunks."
            action={<KnowledgeProcessButton projectId={project.id} />}
          />
        </div>
      ) : (
        <>
          <div className="mt-8 hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.title}</TableCell>
                    <TableCell>
                      <KnowledgeSourceBadge sourceType={document.sourceType} />
                    </TableCell>
                    <TableCell>
                      <KnowledgeStatusBadge status={document.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(document.createdAt).toLocaleDateString('ko-KR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-8 grid gap-4 md:hidden">
            {documents.map((document) => (
              <Card key={document.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{document.title}</CardTitle>
                    <KnowledgeStatusBadge status={document.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <KnowledgeSourceBadge sourceType={document.sourceType} />
                  <p>
                    Created{' '}
                    {new Date(document.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}
