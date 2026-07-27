'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@repo/ui';

import {
  V2_EVIDENCE_OPTIONAL_FIELDS,
  isEvidenceFieldFilled,
  loadV2Validation,
} from '../../lib/v2-validation-store';
import { createV2Workspace } from '../../lib/v2-workspace-store';
import { JourneyLayout } from '../journey-layout';
import { V2JourneyStack } from './v2-journey-stack';

const FINDING_KEYS = ['similarServices', 'competition', 'marketInterest'] as const;
const OPINION_KEYS = ['needsValidation'] as const;
const DETAIL_KEYS = ['market', 'competitor', 'pricing', 'grants'] as const;

export function V2ConclusionView() {
  const t = useTranslations('workflow.v2.conclusion');
  const router = useRouter();
  const validation = loadV2Validation();
  const pipeline = loadAgentPipelineResult();
  const evidence = validation?.evidence;

  const missingFields = useMemo(() => {
    if (!evidence) return V2_EVIDENCE_OPTIONAL_FIELDS;
    return V2_EVIDENCE_OPTIONAL_FIELDS.filter((field) => !isEvidenceFieldFilled(field, evidence));
  }, [evidence]);

  const judgmentKey = useMemo(() => {
    if (!evidence) return 'ideaOnly';
    const optionalFilled = V2_EVIDENCE_OPTIONAL_FIELDS.filter((field) =>
      isEvidenceFieldFilled(field, evidence),
    ).length;
    if (optionalFilled >= 2) return 'partialEvidence';
    if (isEvidenceFieldFilled('problem', evidence) || isEvidenceFieldFilled('customer', evidence)) {
      return 'basicEvidence';
    }
    return 'ideaOnly';
  }, [evidence]);

  const handleCreateWorkspace = () => {
    const name = evidence?.idea
      ? evidence.idea.length <= 36
        ? evidence.idea
        : `${evidence.idea.slice(0, 33).trim()}…`
      : 'AI Startup';
    createV2Workspace(name, validation?.filledCount ?? 1);
    router.push('/workspace');
  };

  const hasPipeline = pipeline?.founderOs != null || pipeline?.decision != null;

  return (
    <JourneyLayout phase="workspace" width="default" versionLabel="V2">
      <V2JourneyStack
        embedded
        main={
          <div className="rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="text-lg font-semibold">{t('findingsTitle')}</h2>
            <div className="mt-4 border-t border-border/60 pt-4">
              <ul className="space-y-3 text-sm leading-relaxed" role="list">
                {FINDING_KEYS.map((key) => (
                  <li key={key}>{t(`findings.${key}`)}</li>
                ))}
              </ul>
            </div>
          </div>
        }
        result={
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('opinionLabel')}
              </p>
              <p className="mt-3 text-sm leading-relaxed">{t(`judgment.${judgmentKey}`)}</p>
              {hasPipeline ? (
                <p className="mt-2 text-xs text-muted-foreground">{t('basedOnInput')}</p>
              ) : null}
            </div>

            <details className="rounded-2xl border border-border/70 bg-muted/20 p-4">
              <summary className="cursor-pointer text-sm font-medium">{t('whySummary')}</summary>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {DETAIL_KEYS.map((key) => (
                  <div
                    key={key}
                    className="rounded-xl border border-border/60 bg-background px-4 py-3 text-sm"
                  >
                    {t(`details.${key}`)}
                  </div>
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-sm" role="list">
                {OPINION_KEYS.map((key) => (
                  <li key={key}>{t(`opinion.${key}`)}</li>
                ))}
              </ul>
            </details>
          </div>
        }
        footer={
          <div className="space-y-5">
            {missingFields.length > 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-5">
                <p className="text-sm font-medium">{t('improveTitle')}</p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground" role="list">
                  {missingFields.map((field) => (
                    <li key={field}>□ {t(`optional.${field}`)}</li>
                  ))}
                </ul>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 rounded-xl"
                  onClick={() => router.push('/validation')}
                >
                  {t('improveCta')}
                </Button>
              </div>
            ) : null}

            <Button
              type="button"
              size="lg"
              className="h-12 w-full rounded-xl font-semibold"
              onClick={handleCreateWorkspace}
            >
              {t('createWorkspaceCta')}
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Button>
          </div>
        }
      />
    </JourneyLayout>
  );
}
