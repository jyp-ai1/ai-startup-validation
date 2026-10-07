'use client';

import { useEffect, type ReactNode } from 'react';

import type { SiEvidenceClass, SiStrategicJudgment } from '@repo/types/domain/strategic-intelligence';
import { SI_STAGE_LABELS } from '@repo/types/domain/strategic-intelligence';
import { cn } from '@repo/ui/lib/utils';

import { presentSiFounderJudgment } from '@/features/strategic-intelligence/lib/present-si-founder-judgment';
import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';

type SiReviewSurfaceProps = {
  judgment: SiStrategicJudgment;
  projectId?: string;
  className?: string;
};

const EVIDENCE_CLASS_LABEL: Record<SiEvidenceClass, string> = {
  FACT: 'FACT',
  CLAIM: 'CLAIM',
  INFERENCE: 'INFERENCE',
  ASSUMPTION: 'ASSUMPTION',
  VALIDATED: 'VALIDATED',
  CONFLICT: 'CONFLICT',
};

function Section({
  testId,
  label,
  children,
}: {
  testId: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section data-testid={testId} className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      {children}
    </section>
  );
}

export function SiReviewSurface({ judgment, projectId, className }: SiReviewSurfaceProps) {
  const presented = presentSiFounderJudgment(judgment);

  useEffect(() => {
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.siJudgmentViewed, {
      project_id: projectId,
      verdict: judgment.verdictId,
      screen: 'workspace',
    });
  }, [judgment.verdictId, projectId]);

  return (
    <article
      data-testid="si-review-surface"
      data-si-verdict={judgment.verdictId}
      data-si-stage={judgment.stageId}
      className={cn(
        'space-y-6 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-background px-6 py-6 sm:px-8',
        className,
      )}
    >
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">S.I. 사업성 판단</p>
        <p className="text-xs text-muted-foreground">{SI_STAGE_LABELS[judgment.stageId]} · 점수 없음</p>
      </header>

      <Section testId="si-current-judgment" label="현재 사업성 판단">
        <p data-testid="si-verdict-label" className="text-[17px] font-semibold leading-snug">
          현재 판단: {presented.headline}
        </p>
        <p data-testid="si-judgment-prose" className="text-sm leading-relaxed">
          {presented.prose}
        </p>
      </Section>

      <Section testId="si-why-possible" label="왜 가능한가">
        <p className="text-sm leading-relaxed">{judgment.whyPossible}</p>
      </Section>

      <Section testId="si-why-fail" label="왜 실패할 수 있는가">
        <p className="text-sm leading-relaxed">{judgment.whyFail}</p>
      </Section>

      <Section testId="si-evidence-map" label="현재 근거">
        {judgment.evidenceMap.length === 0 ? (
          <p className="text-sm text-muted-foreground">나눌 근거가 아직 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {judgment.evidenceMap.map((item) => (
              <li key={item.id} className="flex gap-2 text-sm leading-relaxed">
                <span className="mt-0.5 shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
                  {EVIDENCE_CLASS_LABEL[item.evidenceClass]}
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section testId="si-strengths" label="강점">
          <ul className="space-y-1 text-sm">
            {(judgment.strengths.length ? judgment.strengths : ['아직 강점으로 적을 사실이 없습니다.']).map(
              (line) => (
                <li key={line}>• {line}</li>
              ),
            )}
          </ul>
        </Section>
        <Section testId="si-risks" label="리스크">
          <ul className="space-y-1 text-sm">
            {(judgment.risks.length ? judgment.risks : ['아직 특정된 리스크가 없습니다.']).map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </Section>
      </div>

      <Section testId="si-critical-unknown" label="가장 중요한 미검증 가정">
        <p className="text-sm font-medium leading-relaxed">{judgment.criticalUnknown}</p>
      </Section>

      <Section testId="si-decision-evidence" label="이 판단을 바꿀 증거">
        <p className="text-sm leading-relaxed">{judgment.decisionChangingEvidence}</p>
      </Section>

      <Section testId="si-validation-priority" label="다음에 검증해야 할 1개">
        <p className="text-sm font-medium leading-relaxed">{judgment.validationPriority}</p>
      </Section>
    </article>
  );
}
