import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { DevelopmentSpecWithSections, StartupProject } from '@repo/types/validation';
import { Button, PageHeader } from '@repo/ui';

import { renderMarkdown } from '@/features/reports/utils/markdown';

import { DevelopmentSpecStatusBadge } from './development-spec-status-badge';

type DevelopmentSpecPreviewProps = {
  project: StartupProject;
  spec: DevelopmentSpecWithSections;
};

export async function DevelopmentSpecPreview({ project, spec }: DevelopmentSpecPreviewProps) {
  const tNav = await getTranslations('common.navLinks');
  const basePath = `/projects/${project.id}/development-spec/${spec.id}`;
  const createdDate = new Date(spec.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <PageHeader
        title="Development Spec Preview"
        description={spec.title}
        actions={
          <Button variant="outline" asChild>
            <Link href={basePath}>{tNav('backToEditor')}</Link>
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <DevelopmentSpecStatusBadge status={spec.status} />
        <span className="text-sm text-muted-foreground">{project.title}</span>
        <span className="text-sm text-muted-foreground">· {createdDate}</span>
      </div>

      <article className="mx-auto mt-10 max-w-3xl font-mono text-sm">
        <header className="border-b pb-8">
          <h1 className="font-sans text-3xl font-bold tracking-tight">{spec.title}</h1>
          {spec.summary ? (
            <div
              className="prose prose-neutral dark:prose-invert mt-4 max-w-none font-sans"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(spec.summary) }}
            />
          ) : null}
        </header>

        <div className="space-y-12 py-10">
          {spec.sections.map((section) => (
            <section key={section.id} id={section.sectionType}>
              <h2 className="mb-4 font-sans text-2xl font-semibold">{section.title}</h2>
              {section.content.trim() ? (
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                />
              ) : (
                <p className="italic text-muted-foreground">No content.</p>
              )}
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
