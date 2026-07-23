'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Search, ShieldCheck, FileText } from 'lucide-react';

import { ConsultingEmptyState } from '@/components/consulting/consulting-empty-state';
import { useGuidedEmptyHint } from '@/components/consulting/use-guided-empty-hint';
import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { Button } from '@repo/ui';

type DecisionEmptyViewProps = {
  projectId: string;
  projectTitle: string;
  stats: ProjectDashboardStats;
};

export function DecisionEmptyView({ projectId, projectTitle, stats }: DecisionEmptyViewProps) {
  const t = useTranslations('decision');
  const { aiHint, aiGuideLabel } = useGuidedEmptyHint('decision');
  const base = `/projects/${projectId}`;

  const nextSteps = [
    stats.research.total === 0
      ? { icon: Search, label: t('emptySteps.research'), href: `${base}/research/new` }
      : null,
    stats.evidence.total < 3
      ? { icon: ShieldCheck, label: t('emptySteps.evidence'), href: `${base}/evidence/new` }
      : null,
    stats.voc.total < 2
      ? { icon: FileText, label: t('emptySteps.voc'), href: `${base}/voc/new` }
      : null,
  ].filter(Boolean) as { icon: typeof Search; label: string; href: string }[];

  return (
    <div className="space-y-8">
      <ConsultingEmptyState
        title={t('emptyInsufficientTitle')}
        description={t('emptyInsufficientDescription', { project: projectTitle })}
        primaryLabel={t('emptySteps.research')}
        primaryHref={`${base}/research/new`}
        secondaryLabel={t('emptySteps.evidence')}
        secondaryHref={`${base}/evidence/new`}
        aiHint={aiHint}
        aiGuideLabel={aiGuideLabel}
      />
      {nextSteps.length > 0 ? (
        <div className="ll-consulting-card space-y-3 p-6">
          <p className="text-sm font-semibold">{t('emptyNextStepsTitle')}</p>
          <ul className="space-y-2">
            {nextSteps.map((step) => {
              const Icon = step.icon;
              return (
                <li key={step.href}>
                  <Button variant="ghost" className="h-auto w-full justify-between px-3 py-2" asChild>
                    <Link href={step.href}>
                      <span className="flex items-center gap-2">
                        <Icon className="size-4 text-primary" />
                        {step.label}
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function needsDecisionEmptyState(stats: ProjectDashboardStats): boolean {
  const hasValidation =
    stats.validationScore !== null && stats.validationScore.decision !== 'DRAFT';
  if (hasValidation) return false;

  const inputScore =
    (stats.research.total > 0 ? 1 : 0) +
    (stats.evidence.total >= 2 ? 1 : 0) +
    (stats.voc.total >= 1 ? 1 : 0);

  return inputScore < 2;
}
