'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@repo/ui';

import {
  V2_EVIDENCE_OPTIONAL_FIELDS,
  isEvidenceFieldFilled,
  loadV2Validation,
} from '../../lib/v2-validation-store';
import { createV2Workspace } from '../../lib/v2-workspace-store';
import { JourneyLayout } from '../journey-layout';
import {
  V2ReviewConfirmedPanel,
  V2ReviewJudgmentPanel,
  V2ReviewNextStepsPanel,
  V2ReviewStatusPanel,
  V2ReviewUnderstandingPanel,
} from './v2-review-board-panels';
import { V2JourneyStack } from './v2-journey-stack';

export function V2ConclusionView() {
  const t = useTranslations('workflow.v2.reviewBoard');
  const router = useRouter();
  const validation = loadV2Validation();
  const evidence = validation?.evidence;

  const missingFields = useMemo(() => {
    if (!evidence) return [...V2_EVIDENCE_OPTIONAL_FIELDS];
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

  const handleContinue = () => {
    const name = evidence?.idea
      ? evidence.idea.length <= 36
        ? evidence.idea
        : `${evidence.idea.slice(0, 33).trim()}…`
      : 'AI Startup';
    createV2Workspace(name, validation?.filledCount ?? 1);
    router.push('/workspace');
  };

  if (!evidence) {
    return null;
  }

  return (
    <JourneyLayout phase="workspace" width="default" versionLabel="V2">
      <V2JourneyStack
        embedded
        main={
          <div className="space-y-6">
            <V2ReviewConfirmedPanel />
            <V2ReviewJudgmentPanel judgmentKey={judgmentKey} />
            <V2ReviewStatusPanel evidence={evidence} phase="afterReview" />
          </div>
        }
        result={
          <div className="space-y-6">
            <V2ReviewUnderstandingPanel evidence={evidence} showMissing={false} />
            <V2ReviewNextStepsPanel
              missingFieldKeys={missingFields}
              onAddMore={() => router.push('/validation')}
            />
          </div>
        }
        footer={
          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-xl font-semibold"
            onClick={handleContinue}
          >
            {t('continueCta')}
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </Button>
        }
      />
    </JourneyLayout>
  );
}
