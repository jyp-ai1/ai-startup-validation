'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

import type { ConsultantPrompt } from '../services/consultant-types';

type ConsultantPromptsProps = {
  prompts: ConsultantPrompt[];
  projectId: string;
};

export function ConsultantPrompts({ prompts, projectId }: ConsultantPromptsProps) {
  const t = useTranslations('aiConsultant');
  const { trackEvent } = useAnalytics();

  function handleClick(promptId: string) {
    trackEvent(ANALYTICS_EVENTS.consultantPrompt, {
      project_id: projectId,
      prompt_id: promptId,
    });
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('prompts.title')}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {prompts.map((prompt) => (
          <Button
            key={prompt.id}
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-[11px]"
            asChild
            onClick={() => handleClick(prompt.id)}
          >
            <Link href={prompt.href}>{t(prompt.labelKey as 'prompts.marketResearch')}</Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
