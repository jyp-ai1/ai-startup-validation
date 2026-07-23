'use client';

import { useActionState, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Eye, Pencil, Trash2 } from 'lucide-react';

import type {
  AIReportGeneration,
  StartupProject,
  ValidationReportWithSections,
} from '@repo/types/validation';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  PageHeader,
  Textarea,
} from '@repo/ui';

import { FormSelect } from '@/features/research/components/form-select';
import { AIReportGenerateButton } from '@/features/ai-report';

import {
  deleteReport,
  updateReport,
  type ReportActionState,
} from '../actions/report-actions';
import { REPORT_STATUS_LABELS } from '../utils/default-sections';
import { ReportSectionItem } from './report-section-item';
import { ReportStatusBadge } from './report-status-badge';

const initialState: ReportActionState = {};

type ReportDetailProps = {
  project: StartupProject;
  report: ValidationReportWithSections;
  latestGeneration: AIReportGeneration | null;
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function ReportDetail({ project, report, latestGeneration }: ReportDetailProps) {
  const tNav = useTranslations('common.navLinks');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const updateAction = updateReport.bind(null, project.id, report.id);
  const [state, formAction, pending] = useActionState(updateAction, initialState);

  const basePath = `/projects/${project.id}/reports/${report.id}`;

  function handleDelete() {
    startDelete(async () => {
      await deleteReport(project.id, report.id);
    });
  }

  if (isEditingHeader) {
    return (
      <>
        <PageHeader
          title="Edit Report"
          description={report.title}
          actions={
            <Button variant="outline" onClick={() => setIsEditingHeader(false)}>
              Cancel Edit
            </Button>
          }
        />
        <form action={formAction} className="mt-8 max-w-xl space-y-6">
          {state.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              name="title"
              defaultValue={report.title}
              required
              aria-invalid={Boolean(state.fieldErrors?.title)}
            />
            <FieldError messages={state.fieldErrors?.title} />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <FormSelect
              name="status"
              defaultValue={report.status}
              options={Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="summary" className="text-sm font-medium">
              Summary
            </label>
            <Textarea
              id="summary"
              name="summary"
              rows={3}
              defaultValue={report.summary ?? ''}
              placeholder="Optional report summary"
            />
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save Report'}
          </Button>
        </form>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={report.title}
        description={project.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`${basePath}/preview`}>
                <Eye className="size-4" />
                Preview
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setIsEditingHeader(true)}>
              <Pencil className="size-4" />
              Edit Report
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ReportStatusBadge status={report.status} />
        <span className="text-sm text-muted-foreground">
          {report.sections.length} sections
        </span>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}/reports`}>{tNav('backToReports')}</Link>
        </Button>
      </div>

      {report.summary ? (
        <p className="mt-4 text-sm text-muted-foreground">{report.summary}</p>
      ) : null}

      <div className="mt-6 rounded-lg border bg-muted/20 p-4">
        <h3 className="text-sm font-medium">AI Report Generation</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Generate a validation report draft from project data using AI.
        </p>
        <div className="mt-3">
          <AIReportGenerateButton
            projectId={project.id}
            reportId={report.id}
            latestGeneration={latestGeneration}
          />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {report.sections.map((section, index) => (
          <ReportSectionItem
            key={section.id}
            projectId={project.id}
            reportId={report.id}
            section={section}
            isFirst={index === 0}
            isLast={index === report.sections.length - 1}
          />
        ))}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete report?</DialogTitle>
            <DialogDescription>
              &quot;{report.title}&quot; and all sections will be permanently deleted.
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
