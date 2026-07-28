'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { SmartQuestion } from '../../lib/v2-investigation-types';
import type { DocumentCitation } from '../../lib/v2-reason-chain-types';

type V2SmartQuestionBlockProps = {
  question: SmartQuestion;
  citations?: DocumentCitation[];
  className?: string;
};

export function V2SmartQuestionBlock({
  question,
  citations = [],
  className,
}: V2SmartQuestionBlockProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.investigation.smartQuestion');

  const citation = question.citationId
    ? citations.find((item) => item.id === question.citationId)
    : undefined;

  return (
    <div className={cn('rounded-xl border border-amber-500/30 bg-amber-500/5 p-4', className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
        {t('label')}
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed">{t(`items.${question.id}.lead`)}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t(`items.${question.id}.question`)}
      </p>
      {citation ? (
        <div className="mt-3 rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-xs">
          <p className="font-medium text-muted-foreground">
            {t('citationSource')} · {t('citationPage', { page: citation.page })} · {citation.section}
          </p>
          <p className="mt-1 italic text-foreground/80">"{citation.quote}"</p>
        </div>
      ) : null}
    </div>
  );
}
