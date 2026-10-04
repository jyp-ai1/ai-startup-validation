'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { cn } from '@repo/ui/lib/utils';

import type { DemoUxDisplay } from '@/lib/demo/demo-ux-display';
import { buildDocumentFirstDraft } from '../../lib/business-understanding/build-document-first-draft';
import { founderFieldLabel } from '../../lib/business-understanding/founder-field-labels';
import { formatGapCeoSurfaceLine } from '../../lib/business-understanding/gap-state-ceo-surface';
import { loadWorkspaceDocumentText } from '../../lib/workspace-ai-pm-messages';
import { WorkspaceDemoLoginCta } from '../project-workspace-shell/workspace-demo-login-cta';

type WorkspaceDemoMyBusinessPreviewProps = {
  understanding: BusinessUnderstanding;
  entities?: LaunchLensDomainContext | null;
  projectId?: string;
  display: DemoUxDisplay;
  className?: string;
};

function provenanceShort(provenance: string): string {
  switch (provenance) {
    case 'DOCUMENT':
    case 'USER_CONFIRMED':
      return 'CEO 제공';
    case 'USER_CORRECTED':
      return 'CEO 수정';
    case 'AI_INFERENCE':
      return 'AI 추정 · 확인 필요';
    default:
      return '확인 필요';
  }
}

export function WorkspaceDemoMyBusinessPreview({
  understanding,
  entities = null,
  projectId,
  display,
  className,
}: WorkspaceDemoMyBusinessPreviewProps) {
  const t = useTranslations('workflow.journey.workspaceShell.businessUnderstanding');

  const documentText =
    display.projectFullDescription.trim() ||
    loadWorkspaceDocumentText(projectId)?.trim() ||
    '';

  const draft = useMemo(
    () =>
      documentText.length >= 8
        ? buildDocumentFirstDraft({ documentText, understanding, entities })
        : null,
    [documentText, understanding, entities],
  );

  return (
    <section
      data-testid="demo-my-business-preview"
      className={cn(
        'rounded-2xl border border-primary/25 bg-primary/[0.03] px-5 py-5 sm:px-7',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Demo Workspace</p>
      <h2 className="mt-2 text-lg font-semibold" data-testid="demo-project-title">
        {display.projectTitle}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground" data-testid="demo-project-oneliner">
        {display.projectDescription}
      </p>
      {documentText ? (
        <details className="mt-3" data-testid="demo-business-details">
          <summary className="cursor-pointer text-xs font-medium text-primary">사업내용 보기</summary>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {documentText}
          </p>
        </details>
      ) : null}

      {draft ? (
        <ul className="mt-4 space-y-3">
          {draft.fields.map((field) => (
            <li key={field.id} className="rounded-xl border border-border/60 bg-background/80 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {field.id === 'business'
                  ? '사업'
                  : field.id === 'customer'
                    ? '실제 사용자'
                    : field.id === 'problem'
                      ? '문제'
                      : field.id}
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed">{field.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {provenanceShort(field.provenance)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {draft && draft.gapFieldIds.length > 0 ? (
        <div
          className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3"
          data-testid="gap-ceo-surface-list"
        >
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            추가로 확인이 필요한 내용
          </p>
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
            로그인 후 AI PM이 이어서 질문합니다.
          </p>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        <WorkspaceDemoLoginCta />
        <p className="text-xs text-muted-foreground">{t('confirmLeadHint')}</p>
      </div>
    </section>
  );
}
