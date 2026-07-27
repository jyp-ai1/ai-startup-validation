'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@repo/ui';

import {
  V2_EVIDENCE_OPTIONAL_FIELDS,
  isEvidenceFieldFilled,
  loadV2Validation,
} from '../../lib/v2-validation-store';
import { createV2Workspace } from '../../lib/v2-workspace-store';
import { REVIEW_CONFIRMED_MOCK_KEYS } from '../../lib/v2-review-board';
import { JourneyLayout } from '../journey-layout';
import { V2ReviewBoardReadOnly } from './v2-review-board-workspace';

const CARD = 'rounded-2xl bg-card p-6 shadow-sm ring-1 ring-border/40';

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
    if (!evidence) return;
    const name =
      evidence.idea.length <= 36 ? evidence.idea : `${evidence.idea.slice(0, 33).trim()}…`;
    createV2Workspace(name, validation?.filledCount ?? 1);
    router.push('/workspace');
  };

  if (!evidence) return null;

  return (
    <JourneyLayout phase="workspace" width="default" versionLabel="V2">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8 pb-10">
        {/* 1. AI가 현재 이해한 내용 */}
        <V2ReviewBoardReadOnly evidence={evidence} />

        {/* 2. 이번 검토에서 확인한 내용 */}
        <section className={CARD}>
          <h2 className="text-sm font-semibold tracking-tight">{t('confirmedTitle')}</h2>
          <ul className="mt-5 space-y-3" role="list">
            {REVIEW_CONFIRMED_MOCK_KEYS.map((key) => (
              <li key={key} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                <span aria-hidden>✔</span>
                {t(`confirmed.${key}`)}
              </li>
            ))}
          </ul>
        </section>

        {/* 3. 현재 판단 */}
        <section className={CARD}>
          <h2 className="text-sm font-semibold tracking-tight">{t('judgmentTitle')}</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {t(`judgment.${judgmentKey}`)}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">{t('stageLabel')}</p>
        </section>

        {/* 4. 다음으로 확인하면 좋은 내용 */}
        {missingFields.length > 0 ? (
          <section className={CARD}>
            <h2 className="text-sm font-semibold tracking-tight">{t('nextTitle')}</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground" role="list">
              {missingFields.map((field) => (
                <li key={field}>○ {t(`fields.${field}`)}</li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-5 rounded-lg"
              onClick={() => router.push('/validation')}
            >
              {t('nextCta')}
            </Button>
          </section>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="mt-2 h-12 w-full rounded-xl text-[15px] font-medium"
          onClick={handleContinue}
        >
          {t('continueCta')}
        </Button>
      </div>
    </JourneyLayout>
  );
}
