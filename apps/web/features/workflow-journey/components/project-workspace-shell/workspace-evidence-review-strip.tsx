'use client';

import { useMemo } from 'react';

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { cn } from '@repo/ui/lib/utils';

import { buildDocumentFirstDraft } from '../../lib/business-understanding/build-document-first-draft';
import { founderFieldLabel } from '../../lib/business-understanding/founder-field-labels';
import { formatGapCeoSurfaceLine } from '../../lib/business-understanding/gap-state-ceo-surface';
import { whyNowForGapField } from '../../lib/business-understanding/living-understanding-state';
import { loadWorkspaceDocumentText } from '../../lib/workspace-ai-pm-messages';

type WorkspaceEvidenceReviewStripProps = {
  understanding: BusinessUnderstanding;
  entities?: LaunchLensDomainContext | null;
  projectId?: string;
  className?: string;
};

function provenanceLabel(provenance: string): string {
  switch (provenance) {
    case 'DOCUMENT':
    case 'USER_CONFIRMED':
      return 'CEO 제공 · 문서';
    case 'USER_CORRECTED':
      return 'CEO 수정';
    case 'AI_INFERENCE':
      return 'AI 추정 · 확인 필요';
    default:
      return '확인 필요';
  }
}

/** LS-7 — vertical CEO verification strip (confirmed / inferred / gaps). */
export function WorkspaceEvidenceReviewStrip({
  understanding,
  entities = null,
  projectId,
  className,
}: WorkspaceEvidenceReviewStripProps) {
  const documentText = loadWorkspaceDocumentText(projectId)?.trim() ?? '';
  const draft = useMemo(() => {
    if (documentText.length < 8) return null;
    return buildDocumentFirstDraft({ documentText, understanding, entities });
  }, [documentText, understanding, entities]);

  if (!draft) return null;

  const confirmed = draft.fields.filter((f) => f.provenance !== 'AI_INFERENCE');
  const inferred = draft.fields.filter((f) => f.provenance === 'AI_INFERENCE');

  return (
    <section
      data-testid="workspace-evidence-review-strip"
      className={cn(
        'rounded-2xl border border-border/60 bg-muted/10 px-5 py-4 sm:px-6',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        AI가 이해한 사업
      </p>

      {confirmed.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase text-muted-foreground">확인된 내용</p>
          <ul className="mt-2 space-y-2">
            {confirmed.map((field) => (
              <li key={field.id} className="rounded-lg border border-border/50 bg-background/80 px-3 py-2">
                <p className="text-sm font-medium leading-relaxed">{field.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {provenanceLabel(field.provenance)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {inferred.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase text-amber-800 dark:text-amber-200">
            AI 추정
          </p>
          <ul className="mt-2 space-y-2">
            {inferred.map((field) => (
              <li
                key={field.id}
                className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2"
              >
                <p className="text-sm leading-relaxed">{field.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{provenanceLabel(field.provenance)}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {draft.gapFieldIds.length > 0 ? (
        <div
          className="mt-3 rounded-lg border border-dashed border-primary/30 px-3 py-2"
          data-testid="gap-ceo-surface-list"
        >
          <p className="text-[11px] font-medium uppercase text-muted-foreground">아직 모르는 것</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {draft.gapFieldIds.map((gapId) => (
              <li key={gapId} data-testid="gap-ceo-surface-line">
                {formatGapCeoSurfaceLine({
                  gapLabel: founderFieldLabel(gapId),
                  record: { completeness: 'OPEN' },
                })}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            왜 중요한가 — {whyNowForGapField(draft.gapFieldIds[0] ?? 'customerPersona')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            다음 검증 — 위 공백을 채우면 GO/HOLD 판단 근거가 강해집니다.
          </p>
        </div>
      ) : null}
    </section>
  );
}
