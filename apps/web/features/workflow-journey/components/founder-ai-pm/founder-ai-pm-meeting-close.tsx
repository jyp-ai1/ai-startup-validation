'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { AiPmConversation } from '../ai-state/ai-pm-conversation';

type FounderAiPmMeetingCloseProps = {
  messages: string[];
  onStart: () => void;
  className?: string;
};

export function FounderAiPmMeetingClose({
  messages,
  onStart,
  className,
}: FounderAiPmMeetingCloseProps) {
  const t = useTranslations('workflow.founderAiPm.meeting');

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('close.label')}
    >
      <AiPmConversation messages={messages} />
      <Button
        type="button"
        size="lg"
        className="mt-6 h-14 w-full rounded-xl text-base font-semibold"
        onClick={onStart}
      >
        {t('close.cta')}
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
    </section>
  );
}
