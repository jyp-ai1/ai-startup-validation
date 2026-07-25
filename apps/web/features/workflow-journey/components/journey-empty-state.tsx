'use client';

import Link from 'next/link';
import { FolderPlus, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';

type JourneyEmptyStateProps = {
  onCreate?: () => void;
};

export function JourneyEmptyState({ onCreate }: JourneyEmptyStateProps) {
  const t = useTranslations('workflow.empty');

  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <FolderPlus className="size-7 text-muted-foreground" aria-hidden />
      </span>
      <h2 className="mt-6 text-xl font-semibold tracking-tight">{t('title')}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('desc')}</p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        {onCreate ? (
          <Button type="button" size="lg" className="rounded-xl" onClick={onCreate}>
            <Sparkles className="size-4" aria-hidden />
            {t('ctaCreate')}
          </Button>
        ) : (
          <Button asChild size="lg" className="rounded-xl">
            <Link href="/goal">{t('ctaGoal')}</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg" className="rounded-xl">
          <Link href="/goal">{t('ctaExample')}</Link>
        </Button>
      </div>
    </section>
  );
}
