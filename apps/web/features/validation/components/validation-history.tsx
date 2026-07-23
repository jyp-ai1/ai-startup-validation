import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import type { StartupProject, ValidationScore } from '@repo/types/validation';
import { formatLocaleDate } from '@repo/utils/date';
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

import { ValidationDecisionBadge } from './validation-decision-badge';

type ValidationHistoryProps = {
  project: StartupProject;
  history: ValidationScore[];
};

export async function ValidationHistory({ project, history }: ValidationHistoryProps) {
  const locale = await getLocale();
  const t = await getTranslations('validation');
  const tCommon = await getTranslations('common');
  const tPages = await getTranslations('pages');
  const tNav = await getTranslations('common.navLinks');
  const basePath = `/projects/${project.id}/validation`;

  return (
    <>
      <PageHeader
        title={t('historyTitle')}
        description={t('historyDesc', { project: project.title })}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={basePath}>{tNav('backToValidation')}</Link>
        </Button>
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/projects/${project.id}`}>{tNav('backToProject')}</Link>
        </Button>
      </div>

      {history.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={t('historyEmptyTitle')}
            description={t('historyEmptyDesc')}
            action={
              <Button asChild>
                <Link href={`${basePath}/new`}>{tPages('newValidation')}</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon('fields.date')}</TableHead>
                <TableHead>{t('totalScore')}</TableHead>
                <TableHead>{t('kpi.decision')}</TableHead>
                <TableHead>{tCommon('fields.comment')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {formatLocaleDate(new Date(entry.createdAt), locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{entry.totalScore}</TableCell>
                  <TableCell>
                    <ValidationDecisionBadge decision={entry.decision} />
                  </TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {entry.comment ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
