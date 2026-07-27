'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

import { MOCK_DECISION } from '../constants/mock-questions';

export function InterviewDecisionPlaceholder() {
  const t = useTranslations('interview.decision');
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 rounded-2xl border border-border/70 bg-card p-8">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">{MOCK_DECISION.title}</p>
        <p className="text-xl font-semibold leading-snug tracking-tight">{MOCK_DECISION.summary}</p>
      </div>

      {expanded ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{MOCK_DECISION.detail}</p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? t('collapse') : t('expand')}
      </Button>
    </div>
  );
}
