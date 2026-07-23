'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Circle, RefreshCw } from 'lucide-react';

import type { DecisionResult } from '@/features/decision';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { DecisionConfidencePanel } from './decision-confidence-panel';
import { DecisionDriversPanel } from './decision-drivers-panel';
import { DecisionEvidenceCoverage } from './decision-evidence-coverage';
import { DecisionExplainDialog } from './decision-explain-dialog';
import { DecisionExplainScore } from './decision-explain-score';
import { DecisionSupportingEvidence } from './decision-supporting-evidence';
import { DecisionVerdictBadge } from './decision-verdict-badge';

type DecisionCenterViewProps = {
  decision: DecisionResult;
  projectId: string;
  projectTitle: string;
};

const SEVERITY_CLASS = {
  HIGH: 'text-rose-600 dark:text-rose-400',
  MEDIUM: 'text-amber-600 dark:text-amber-400',
  LOW: 'text-emerald-600 dark:text-emerald-400',
} as const;

export function DecisionCenterView({
  decision,
  projectId,
  projectTitle,
}: DecisionCenterViewProps) {
  const t = useTranslations('decision');
  const { trackEvent } = useAnalytics();
  const { explanation } = decision;

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.decisionView, {
      project_id: projectId,
      project_type: decision.projectType,
      screen: `/projects/${projectId}/decision`,
      status: decision.verdict,
    });
    trackEvent(ANALYTICS_EVENTS.decisionGenerate, {
      project_id: projectId,
      project_type: decision.projectType,
      provider: decision.providerId,
    });
  }, [decision, projectId, trackEvent]);

  function handleActionClick(actionId: string) {
    trackEvent(ANALYTICS_EVENTS.decisionActionClick, {
      project_id: projectId,
      screen: `/projects/${projectId}/decision`,
      status: actionId,
    });
  }

  function handleDriverClick(driverId: string) {
    trackEvent(ANALYTICS_EVENTS.decisionDriverClick, {
      project_id: projectId,
      screen: `/projects/${projectId}/decision`,
      status: driverId,
    });
  }

  function handleMissingClick(id: string) {
    trackEvent(ANALYTICS_EVENTS.missingDataClick, {
      project_id: projectId,
      screen: `/projects/${projectId}/decision`,
      status: id,
    });
  }

  return (
    <div className="space-y-12 pb-16">
      <PageHeader
        title={t('centerTitle')}
        description={projectTitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DecisionExplainDialog
              steps={explanation.decisionLogic}
              projectId={projectId}
              verdict={decision.verdict}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${projectId}`}>{t('backToProject')}</Link>
            </Button>
          </div>
        }
      />

      {/* CEO Executive Summary */}
      <section className="ll-executive-panel px-8 py-10 md:px-12">
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border/50 pb-8">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-ai">
              {t('ceoSummaryEyebrow')}
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              {t('ceoSummaryTitle')}
            </h1>
          </div>
          <DecisionVerdictBadge verdict={decision.verdict} size="lg" />
        </div>
        <div className="mt-8 space-y-3">
          {decision.executiveSummaryKeys.map((key) => (
            <p key={key} className="text-[15px] leading-relaxed text-foreground/90">
              {t(key as 'executive.insufficient1')}
            </p>
          ))}
        </div>
      </section>

      {/* Decision rationale bullets */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{t('reasonTitle')}</h2>
        <ul className="space-y-3">
          {decision.reasons.map((reason) => (
            <li
              key={reason.id}
              className="flex gap-3 rounded-lg border border-border/50 bg-card px-5 py-4 text-[15px] leading-relaxed"
            >
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{t(reason.textKey as 'reasons.hold.voc', reason.params ?? {})}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Confidence */}
      <DecisionConfidencePanel
        confidence={decision.scores.confidence}
        factors={explanation.confidenceFactors}
      />

      {/* Evidence Coverage */}
      <DecisionEvidenceCoverage
        coverage={explanation.evidenceCoverage}
        onMissingClick={handleMissingClick}
      />

      {/* Decision Drivers */}
      <DecisionDriversPanel
        drivers={explanation.drivers}
        onDriverClick={handleDriverClick}
      />

      {/* Explain Score breakdown */}
      <DecisionExplainScore explainScore={explanation.explainScore} />

      {/* Risk Matrix */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{t('riskTitle')}</h2>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('riskColumn')}</TableHead>
                  <TableHead>{t('severityColumn')}</TableHead>
                  <TableHead>{t('probabilityColumn')}</TableHead>
                  <TableHead>{t('impactColumn')}</TableHead>
                  <TableHead>{t('mitigationColumn')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decision.risks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell className="font-medium">
                      {t(risk.riskKey as 'risks.competitionIntensity')}
                    </TableCell>
                    <TableCell className={SEVERITY_CLASS[risk.severity]}>
                      {t(`severity.${risk.severity.toLowerCase()}` as 'severity.high')}
                    </TableCell>
                    <TableCell className={SEVERITY_CLASS[risk.probability]}>
                      {t(`probability.${risk.probability.toLowerCase()}` as 'probability.high')}
                    </TableCell>
                    <TableCell className={SEVERITY_CLASS[risk.impact]}>
                      {t(`impact.${risk.impact.toLowerCase()}` as 'impact.high')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t(risk.mitigationKey as 'risks.competitionMitigation')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Opportunity */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{t('opportunityTitle')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {decision.opportunities.map((opp) => (
            <Card key={opp.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {t(opp.titleKey as 'opportunities.market.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {t(opp.descriptionKey as 'opportunities.market.desc')}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {t(
                    `opportunityCategory.${opp.category.toLowerCase()}` as 'opportunityCategory.market',
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Recommended Actions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{t('actionsTitle')}</h2>
        <div className="space-y-4">
          {decision.recommendedActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              onClick={() => handleActionClick(action.id)}
              className="ll-consulting-card-hover group flex flex-col gap-4 sm:flex-row sm:items-center"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                P{action.priority}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[18px] font-semibold tracking-tight group-hover:text-primary">
                  {t(action.labelKey as 'actions.voc10.label')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(action.descriptionKey as 'actions.voc10.desc')}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-muted-foreground">
                  <span>{t('scoreImpactShort', { points: action.scoreImpact })}</span>
                  <span>{t('daysShort', { days: action.estimatedDays })}</span>
                  <span>{t(action.effectKey as 'actions.voc10.effect')}</span>
                </div>
              </div>
              <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>

      {/* Missing Evidence */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{t('missingTitle')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {decision.missingEvidence.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => {
                if (!item.completed) handleMissingClick(item.id);
              }}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 transition-colors hover:border-primary/40"
            >
              {item.completed ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="size-5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'text-sm',
                  item.completed && 'text-muted-foreground line-through',
                )}
              >
                {t(item.labelKey as 'missing.vocInterviews')}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Supporting Evidence */}
      <DecisionSupportingEvidence items={explanation.supportingEvidence} />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="size-3.5" />
        {t('generatedAt', { time: new Date(decision.generatedAt).toLocaleString() })}
      </div>
    </div>
  );
}
