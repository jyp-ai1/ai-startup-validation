'use client';

import Link from 'next/link';
import { Brain, MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatRelativeTime } from '@repo/utils/date';
import { Button } from '@repo/ui';

import type { IntelligenceMemorySections, ProactiveMessage } from '../types';

type ConsultantMemoryUpgradeProps = {
  projectId: string;
  sections: IntelligenceMemorySections;
  proactiveMessage: ProactiveMessage;
};

function MemorySection({
  titleKey,
  entries,
}: {
  titleKey: string;
  entries: IntelligenceMemorySections['conversations'];
}) {
  const t = useTranslations('memory');

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t(titleKey as 'sections.conversations')}
      </h4>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li key={entry.id} className="truncate text-xs text-muted-foreground">
            {entry.title}
            <span className="ml-2 text-[10px]">
              {formatRelativeTime(new Date(entry.occurredAt))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ConsultantMemoryUpgrade({
  projectId,
  sections,
  proactiveMessage,
}: ConsultantMemoryUpgradeProps) {
  const t = useTranslations('memory');

  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <MessageSquare className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 space-y-2">
          <p className="text-xs leading-relaxed text-foreground">
            {t(proactiveMessage.messageKey as 'proactive.continue', proactiveMessage.messageParams)}
          </p>
          {proactiveMessage.actionHref && proactiveMessage.actionKey ? (
            <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
              <Link href={proactiveMessage.actionHref}>
                {t(proactiveMessage.actionKey as 'proactive.action.continue')}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 border-t border-border/50 pt-3">
        <div className="flex items-center gap-2">
          <Brain className="size-3.5 text-primary/70" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('sections.title')}
          </h3>
        </div>
        <MemorySection titleKey="sections.conversations" entries={sections.conversations} />
        <MemorySection titleKey="sections.research" entries={sections.research} />
        <MemorySection titleKey="sections.decisions" entries={sections.decisions} />
        <MemorySection titleKey="sections.reports" entries={sections.reports} />
        <MemorySection titleKey="sections.activity" entries={sections.activities} />
      </div>
    </section>
  );
}
