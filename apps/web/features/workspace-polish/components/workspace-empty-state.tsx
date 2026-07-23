'use client';

import Link from 'next/link';
import { ArrowRight, Bot, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

type WorkspaceEmptyStateProps = {
  titleKey: string;
  suggestionKey: string;
  ctaHref: string;
  ctaLabelKey: string;
  projectId: string;
};

export function WorkspaceEmptyState({
  titleKey,
  suggestionKey,
  ctaHref,
  ctaLabelKey,
  projectId,
}: WorkspaceEmptyStateProps) {
  const tw = useTranslations('workspace.home');
  const te = useTranslations('polish.empty');

  return (
    <div className="ll-consulting-card flex flex-col items-start gap-5 border-dashed border-primary/25 bg-primary/[0.02] motion-safe:animate-in motion-safe:fade-in">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Bot className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{te('aiGuide')}</p>
          <h3 className="mt-1 text-lg font-semibold">{tw(titleKey as 'empty.title')}</h3>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            {tw(suggestionKey as 'empty.suggestion')}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{te('hint')}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={ctaHref}>
            <Sparkles className="size-4" />
            {tw(ctaLabelKey as 'empty.cta')}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/projects/${projectId}/agent`}>{te('runAi')}</Link>
        </Button>
      </div>
    </div>
  );
}
