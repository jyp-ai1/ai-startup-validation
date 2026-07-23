'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';

import type { Evidence, ResearchPlan, StartupProject } from '@repo/types/validation';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  PageHeader,
} from '@repo/ui';

import { useLocalizedFormatters } from '@/lib/i18n/use-localized-formatters';

import { deleteEvidence } from '../actions/evidence-actions';
import {
  EVIDENCE_CATEGORY_LABELS,
  EVIDENCE_CONFIDENCE_LABELS,
  EVIDENCE_SOURCE_TYPE_LABELS,
} from '../schemas/evidence-schema';
import {
  EvidenceCategoryBadge,
  EvidenceConfidenceBadge,
  EvidenceSourceBadge,
} from './evidence-badges';
import { EvidenceForm } from './evidence-form';

type EvidenceDetailProps = {
  project: StartupProject;
  evidence: Evidence;
  researchPlans: ResearchPlan[];
  linkedResearch?: ResearchPlan | null;
};

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
      <span className="w-32 shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function EvidenceDetail({
  project,
  evidence,
  researchPlans,
  linkedResearch,
}: EvidenceDetailProps) {
  const t = useTranslations('evidence');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('common.navLinks');
  const { formatDate } = useLocalizedFormatters();
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const listPath = `/projects/${project.id}/evidence`;
  const createdDate = formatDate(new Date(evidence.createdAt));
  const publishedDate = evidence.publishedDate
    ? formatDate(new Date(evidence.publishedDate))
    : null;

  function handleDelete() {
    startDelete(async () => {
      await deleteEvidence(project.id, evidence.id);
    });
  }

  if (isEditing) {
    return (
      <>
        <PageHeader
          title={t('editTitle')}
          description={evidence.title}
          actions={
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              {tCommon('cancelEdit')}
            </Button>
          }
        />
        <div className="mt-8">
          <EvidenceForm
            mode="edit"
            projectId={project.id}
            researchPlans={researchPlans}
            evidence={evidence}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={evidence.title}
        description={project.title}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" />
              {tCommon('edit')}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              {tCommon('delete')}
            </Button>
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <EvidenceCategoryBadge category={evidence.category} />
        <EvidenceConfidenceBadge confidence={evidence.confidence} />
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={listPath}>{tNav('backToEvidence')}</Link>
        </Button>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">{t('detailsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetaRow label={tCommon('fields.category')}>
            {EVIDENCE_CATEGORY_LABELS[evidence.category]}
          </MetaRow>
          <MetaRow label={tCommon('fields.confidence')}>
            {EVIDENCE_CONFIDENCE_LABELS[evidence.confidence]}
          </MetaRow>
          <MetaRow label={tCommon('fields.source')}>
            <EvidenceSourceBadge
              sourceType={evidence.sourceType}
              sourceName={evidence.sourceName}
            />
            {evidence.sourceType ? (
              <span className="ml-2 text-muted-foreground">
                ({EVIDENCE_SOURCE_TYPE_LABELS[evidence.sourceType]})
              </span>
            ) : null}
          </MetaRow>
          {evidence.sourceUrl ? (
            <MetaRow label={tCommon('fields.url')}>
              <a
                href={evidence.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {evidence.sourceUrl}
                <ExternalLink className="size-3.5" />
              </a>
            </MetaRow>
          ) : null}
          {linkedResearch ? (
            <MetaRow label={tCommon('fields.researchPlan')}>
              <Link
                href={`/projects/${project.id}/research/${linkedResearch.id}`}
                className="text-primary hover:underline"
              >
                {linkedResearch.title}
              </Link>
            </MetaRow>
          ) : null}
          {publishedDate ? (
            <MetaRow label={tCommon('fields.published')}>{publishedDate}</MetaRow>
          ) : null}
          <MetaRow label={tCommon('fields.created')}>{createdDate}</MetaRow>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {tCommon('fields.summary')}
            </p>
            <p className="whitespace-pre-wrap text-sm">{evidence.summary}</p>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              {tCommon('fields.content')}
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {evidence.content?.trim() ? evidence.content : tCommon('notProvided')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirmDesc', { title: evidence.title })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? tCommon('processing') : tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
