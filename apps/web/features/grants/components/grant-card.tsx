'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { GovernmentGrant } from '@repo/types/validation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui';

import { useLocalizedFormatters } from '@/lib/i18n/use-localized-formatters';

import {
  GrantFitScoreBadge,
  GrantStatusBadge,
  GrantSupportTypeBadge,
  GrantTargetStageBadge,
} from './grant-badges';

type GrantCardProps = {
  projectId: string;
  grant: GovernmentGrant;
};

export function GrantCard({ projectId, grant }: GrantCardProps) {
  const t = useTranslations('common');
  const { formatDate } = useLocalizedFormatters();
  const href = `/projects/${projectId}/grants/${grant.id}`;
  const deadlineLabel = grant.deadline
    ? formatDate(new Date(grant.deadline))
    : t('noDeadline');

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">
              <Link href={href} className="hover:underline">
                {grant.name}
              </Link>
            </CardTitle>
            <CardDescription>{grant.organization}</CardDescription>
          </div>
          <GrantFitScoreBadge score={grant.fitScore} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <GrantSupportTypeBadge type={grant.supportType} />
          <GrantTargetStageBadge stage={grant.targetStage} />
          <GrantStatusBadge status={grant.status} />
        </div>
        <p className="text-muted-foreground">
          {t('fields.deadline')}: {deadlineLabel}
        </p>
      </CardContent>
    </Card>
  );
}
