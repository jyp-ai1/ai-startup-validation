'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, Trash2 } from 'lucide-react';

import type { DevelopmentSpecWithSections, StartupProject } from '@repo/types/validation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  PageHeader,
} from '@repo/ui';

import { renderMarkdown } from '@/features/reports/utils/markdown';

import { deleteDevelopmentSpec } from '../actions/development-spec-actions';
import { DevelopmentSpecGenerateButton } from './development-spec-generate-button';
import { DevelopmentSpecSectionItem } from './development-spec-section-item';
import { DevelopmentSpecStatusBadge } from './development-spec-status-badge';

type DevelopmentSpecDetailProps = {
  project: StartupProject;
  spec: DevelopmentSpecWithSections;
};

export function DevelopmentSpecDetail({ project, spec }: DevelopmentSpecDetailProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const basePath = `/projects/${project.id}/development-spec/${spec.id}`;

  function handleDelete() {
    startDelete(async () => {
      await deleteDevelopmentSpec(project.id, spec.id);
    });
  }

  return (
    <>
      <PageHeader
        title={spec.title}
        description={project.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DevelopmentSpecGenerateButton
              projectId={project.id}
              specId={spec.id}
              prdId={spec.prdId}
              label="Regenerate"
            />
            <Button variant="outline" asChild>
              <Link href={`${basePath}/preview`}>
                <Eye className="size-4" />
                Preview
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <DevelopmentSpecStatusBadge status={spec.status} />
        <span className="text-sm text-muted-foreground">{spec.sections.length} sections</span>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}/development-spec`}>Back to list</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}/prd/${spec.prdId}`}>View PRD</Link>
        </Button>
      </div>

      {spec.summary ? (
        <div
          className="prose prose-sm dark:prose-invert mt-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(spec.summary) }}
        />
      ) : null}

      <div className="mt-8 space-y-4">
        {spec.sections.map((section) => (
          <DevelopmentSpecSectionItem
            key={section.id}
            projectId={project.id}
            specId={spec.id}
            section={section}
          />
        ))}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete development spec?</DialogTitle>
            <DialogDescription>
              &quot;{spec.title}&quot; will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
