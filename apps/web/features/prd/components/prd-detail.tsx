'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, Trash2 } from 'lucide-react';

import type { PRDWithSections, StartupProject } from '@repo/types/validation';
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

import { deletePRD } from '../actions/prd-actions';
import { PRDGenerateButton } from './prd-generate-button';
import { PRDSectionItem } from './prd-section-item';
import { PRDStatusBadge } from './prd-status-badge';

type PRDDetailProps = {
  project: StartupProject;
  prd: PRDWithSections;
};

export function PRDDetail({ project, prd }: PRDDetailProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const basePath = `/projects/${project.id}/prd/${prd.id}`;

  function handleDelete() {
    startDelete(async () => {
      await deletePRD(project.id, prd.id);
    });
  }

  return (
    <>
      <PageHeader
        title={prd.title}
        description={project.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PRDGenerateButton projectId={project.id} prdId={prd.id} label="Regenerate" />
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
        <PRDStatusBadge status={prd.status} />
        <span className="text-sm text-muted-foreground">{prd.sections.length} sections</span>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}/prd`}>Back to list</Link>
        </Button>
      </div>

      {prd.summary ? (
        <div
          className="prose prose-sm dark:prose-invert mt-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(prd.summary) }}
        />
      ) : null}

      <div className="mt-8 space-y-4">
        {prd.sections.map((section) => (
          <PRDSectionItem
            key={section.id}
            projectId={project.id}
            prdId={prd.id}
            section={section}
          />
        ))}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete PRD?</DialogTitle>
            <DialogDescription>
              &quot;{prd.title}&quot; will be permanently deleted.
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
