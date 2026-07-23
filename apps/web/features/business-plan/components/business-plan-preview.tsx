import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { BusinessPlanWithSections, StartupProject } from '@repo/types/validation';
import { Button, PageHeader } from '@repo/ui';

import { renderMarkdown } from '@/features/reports/utils/markdown';

import { BusinessPlanStatusBadge } from './business-plan-status-badge';

type BusinessPlanPreviewProps = {
  project: StartupProject;
  plan: BusinessPlanWithSections;
};

export async function BusinessPlanPreview({ project, plan }: BusinessPlanPreviewProps) {
  const tNav = await getTranslations('common.navLinks');
  const basePath = `/projects/${project.id}/business-plan/${plan.id}`;
  const createdDate = new Date(plan.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <PageHeader
        title="Business Plan Preview"
        description={plan.title}
        actions={
          <Button variant="outline" asChild>
            <Link href={basePath}>{tNav('backToEditor')}</Link>
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <BusinessPlanStatusBadge status={plan.status} />
        <span className="text-sm text-muted-foreground">{project.title}</span>
        <span className="text-sm text-muted-foreground">· {createdDate}</span>
      </div>

      <article className="mx-auto mt-10 max-w-3xl">
        <header className="border-b pb-8">
          <h1 className="text-3xl font-bold tracking-tight">{plan.title}</h1>
          {plan.summary ? (
            <div
              className="prose prose-neutral dark:prose-invert mt-4 max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.summary) }}
            />
          ) : null}
        </header>

        <div className="space-y-12 py-10">
          {plan.sections.map((section) => (
            <section key={section.id} id={section.sectionType}>
              <h2 className="mb-4 text-2xl font-semibold">{section.title}</h2>
              {section.content.trim() ? (
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                />
              ) : (
                <p className="text-sm italic text-muted-foreground">No content.</p>
              )}
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
