import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import type { PRDWithSections, StartupProject } from '@repo/types/validation';
import { formatLocaleDate } from '@repo/utils/date';
import { Button, PageHeader } from '@repo/ui';

import { renderMarkdown } from '@/features/reports/utils/markdown';

import { PRDStatusBadge } from './prd-status-badge';

type PRDPreviewProps = {
  project: StartupProject;
  prd: PRDWithSections;
};

export async function PRDPreview({ project, prd }: PRDPreviewProps) {
  const locale = await getLocale();
  const t = await getTranslations('prd');
  const tCommon = await getTranslations('common');
  const tNav = await getTranslations('common.navLinks');
  const basePath = `/projects/${project.id}/prd/${prd.id}`;
  const createdDate = formatLocaleDate(new Date(prd.createdAt), locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <PageHeader
        title={t('previewTitle')}
        description={prd.title}
        actions={
          <Button variant="outline" asChild>
            <Link href={basePath}>{tNav('backToEditor')}</Link>
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PRDStatusBadge status={prd.status} />
        <span className="text-sm text-muted-foreground">{project.title}</span>
        <span className="text-sm text-muted-foreground">· {createdDate}</span>
      </div>

      <article className="mx-auto mt-10 max-w-3xl">
        <header className="border-b pb-8">
          <h1 className="text-3xl font-bold tracking-tight">{prd.title}</h1>
          {prd.summary ? (
            <div
              className="prose prose-neutral dark:prose-invert mt-4 max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(prd.summary) }}
            />
          ) : null}
        </header>

        <div className="space-y-12 py-10">
          {prd.sections.map((section) => (
            <section key={section.id} id={section.sectionType}>
              <h2 className="mb-4 text-2xl font-semibold">{section.title}</h2>
              {section.content.trim() ? (
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(section.content) }}
                />
              ) : (
                <p className="text-sm italic text-muted-foreground">{tCommon('noContent')}</p>
              )}
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
