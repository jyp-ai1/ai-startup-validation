'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { IntelligencePage } from '@/components/intelligence';
import { buildKnowledgeInsights } from '@/lib/intelligence/build-feature-insights';
import type { KnowledgeDocument, StartupProject } from '@repo/types/validation';
import { Button } from '@repo/ui';

import { KnowledgeProcessButton } from './knowledge-process-button';
import { KnowledgeSourceBadge, KnowledgeStatusBadge } from './knowledge-badges';

type KnowledgeListProps = {
  project: StartupProject;
  documents: KnowledgeDocument[];
};

export function KnowledgeList({ project, documents }: KnowledgeListProps) {
  const t = useTranslations();
  const basePath = `/projects/${project.id}/knowledge`;
  const insight = buildKnowledgeInsights(documents);

  return (
    <IntelligencePage
      eyebrow={t('meta.appName')}
      title={t('nav.knowledge')}
      description={t('knowledge.description', { project: project.title })}
      insight={insight}
      actions={
        <div className="flex flex-wrap gap-2">
          <KnowledgeProcessButton projectId={project.id} />
          <Button variant="outline" asChild>
            <Link href={`${basePath}/query`}>
              <Search className="size-4" />
              {t('knowledge.aiQuery')}
            </Link>
          </Button>
        </div>
      }
      emptyState={
        documents.length === 0 ? (
          <ConsultingEmptyState
            title={t('knowledge.emptyTitle')}
            description={t('knowledge.description', { project: project.title })}
            primaryLabel={t('knowledge.processEvidence')}
            primaryHref={`/projects/${project.id}/evidence`}
          />
        ) : undefined
      }
      rawData={
        documents.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border/50">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left text-[13px] text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">{t('knowledge.columns.title')}</th>
                  <th className="px-6 py-4">{t('knowledge.columns.source')}</th>
                  <th className="px-6 py-4">{t('knowledge.columns.status')}</th>
                  <th className="px-6 py-4">{t('knowledge.columns.created')}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id} className="border-b border-border/30 last:border-0">
                    <td className="px-6 py-4 font-medium">{document.title}</td>
                    <td className="px-6 py-4">
                      <KnowledgeSourceBadge sourceType={document.sourceType} />
                    </td>
                    <td className="px-6 py-4">
                      <KnowledgeStatusBadge status={document.status} />
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(document.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null
      }
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((document) => (
          <div
            key={document.id}
            className="rounded-2xl border border-border/50 bg-card p-8 transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-lg font-medium">{document.title}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <KnowledgeSourceBadge sourceType={document.sourceType} />
              <KnowledgeStatusBadge status={document.status} />
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground">
              {new Date(document.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </IntelligencePage>
  );
}
