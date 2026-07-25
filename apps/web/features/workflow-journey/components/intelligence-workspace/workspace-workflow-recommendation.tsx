'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Layers } from 'lucide-react';

import { Button } from '@repo/ui';

type WorkspaceWorkflowRecommendationProps = {
  goalId: string;
  className?: string;
};

export function WorkspaceWorkflowRecommendation({ className }: WorkspaceWorkflowRecommendationProps) {
  const t = useTranslations('workflow.epic3.workflowRec');

  return (
    <section className={className}>
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          <Layers className="size-3.5" aria-hidden />
          {t('eyebrow')}
        </p>
        <p className="mt-2 text-lg font-semibold">{t('title')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
        <Button asChild variant="outline" size="sm" className="mt-4 rounded-xl">
          <Link href="/goal?next=mvp-development">
            {t('cta')}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
