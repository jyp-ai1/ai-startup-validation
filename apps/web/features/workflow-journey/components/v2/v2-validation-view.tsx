'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/navigation';

import {
  type V2EvidenceField,
  isEvidenceFieldFilled,
  saveV2Validation,
} from '../../lib/v2-validation-store';
import { JourneyLayout } from '../journey-layout';
import { V2ReviewBoardWorkspace } from './v2-review-board-workspace';

export function V2ValidationView() {
  const router = useRouter();
  const [idea, setIdea] = useState('');
  const [optional, setOptional] = useState<Record<V2EvidenceField, string>>({
    problem: '',
    customer: '',
    mvp: '',
    pricing: '',
  });

  const evidence = useMemo(
    () => ({
      idea: idea.trim(),
      problem: optional.problem.trim() || undefined,
      customer: optional.customer.trim() || undefined,
      mvp: optional.mvp.trim() || undefined,
      pricing: optional.pricing.trim() || undefined,
    }),
    [idea, optional],
  );

  const handleStartReview = () => {
    if (!isEvidenceFieldFilled('idea', evidence)) return;
    saveV2Validation(evidence);
    router.push('/investigate');
  };

  const handleOptionalChange = (field: V2EvidenceField, value: string) => {
    setOptional((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <JourneyLayout phase="workflow" width="default" versionLabel="V2">
      <V2ReviewBoardWorkspace
        idea={idea}
        optional={optional}
        onIdeaChange={setIdea}
        onOptionalChange={handleOptionalChange}
        onStartReview={handleStartReview}
      />
    </JourneyLayout>
  );
}
