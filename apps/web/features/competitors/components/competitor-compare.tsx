import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { CompetitorComparison, StartupProject } from '@repo/types/validation';
import type { CompetitorComparisonField } from '@repo/types/validation';
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

import { COMPARISON_FIELD_LABELS } from '../schemas/competitor-schema';
import { CompetitorCategoryBadge } from './competitor-badges';

type CompetitorCompareProps = {
  project: StartupProject;
  comparison: CompetitorComparison;
};

function getFieldValue(
  competitor: CompetitorComparison['competitors'][number],
  field: CompetitorComparisonField,
): string {
  const value = competitor[field];
  return value?.trim() ? value : '—';
}

export async function CompetitorCompare({
  project,
  comparison,
}: CompetitorCompareProps) {
  const t = await getTranslations('competitors');
  const tNav = await getTranslations('common.navLinks');
  const basePath = `/projects/${project.id}/competitors`;
  const { competitors, fields } = comparison;

  return (
    <>
      <PageHeader
        title={t('compareTitle')}
        description={t('compareDesc', { project: project.title })}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={basePath}>{tNav('backToCompetitors')}</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>{tNav('backToProject')}</Link>
        </Button>
      </div>

      {competitors.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={t('compareEmptyTitle')}
            description={t('compareEmptyDesc')}
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>{t('addCompetitor')}</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px] sticky left-0 bg-background">
                  {t('compareFieldColumn')}
                </TableHead>
                {competitors.map((competitor) => (
                  <TableHead key={competitor.id} className="min-w-[200px]">
                    <Link
                      href={`${basePath}/${competitor.id}`}
                      className="font-medium hover:underline"
                    >
                      {competitor.name}
                    </Link>
                    <div className="mt-1">
                      <CompetitorCategoryBadge category={competitor.category} />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field}>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    {COMPARISON_FIELD_LABELS[field]}
                  </TableCell>
                  {competitors.map((competitor) => (
                    <TableCell key={`${competitor.id}-${field}`}>
                      <span className="whitespace-pre-wrap text-sm">
                        {getFieldValue(competitor, field)}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
