'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { sanitizeAiPmParagraphs } from '@/lib/ai/ai-response-sanitizer';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  buildAiPmPrimaryMessage,
  canProceedWorkspaceReview,
  type WorkspaceDomainEvidence,
  type WorkspaceDomainFieldId,
} from '../../lib/workspace-ai-pm-messages';
import { WorkspaceDomainFields } from './workspace-domain-fields';
import { WorkspaceProgressiveOverview } from './workspace-progressive-overview';

type WorkspaceAiPmMainProps = {
  domain: WorkspaceDomainEvidence;
  entities?: LaunchLensDomainContext | null;
  reviewCount: number;
  businessScore: number | null;
  phase: 'compose' | 'reviewing' | 'board' | 'followUp';
  readOnly?: boolean;
  onDomainChange: (field: WorkspaceDomainFieldId, value: string) => void;
  onReview: () => void;
  className?: string;
};

export function WorkspaceAiPmMain({
  domain,
  entities = null,
  reviewCount,
  businessScore,
  phase,
  readOnly = false,
  onDomainChange,
  onReview,
  className,
}: WorkspaceAiPmMainProps) {
  const t = useTranslations('workflow.v2.workspaceShell.aiPmMain');
  const message = buildAiPmPrimaryMessage(domain, reviewCount);
  const paragraphs = sanitizeAiPmParagraphs(message.paragraphs);
  const canReview = canProceedWorkspaceReview(domain);

  if (phase === 'reviewing') {
    return (
      <section
        className={cn(
          'flex min-h-[420px] flex-col items-center justify-center py-16 text-center lg:min-h-[480px]',
          className,
        )}
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
        <p className="mt-4 text-sm font-medium">{t('reviewingTitle')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('reviewingHint')}</p>
      </section>
    );
  }

  return (
    <div className={cn('mx-auto max-w-[720px] space-y-10 py-2', className)}>
      <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-background px-6 py-6 sm:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
          {t('label')}
        </p>
        <div className="mt-4 space-y-3 text-[15px] leading-relaxed">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <WorkspaceDomainFields
        domain={domain}
        entities={entities}
        activeField={message.activeField}
        readOnly={readOnly}
        onChange={onDomainChange}
      />

      {!message.blocked && reviewCount === 0 ? (
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            className="rounded-xl"
            disabled={!canReview || readOnly}
            onClick={onReview}
          >
            {t('reviewCta')}
          </Button>
        </div>
      ) : null}

      {reviewCount > 0 ? (
        <WorkspaceProgressiveOverview businessScore={businessScore} reviewCount={reviewCount} />
      ) : null}
    </div>
  );
}
