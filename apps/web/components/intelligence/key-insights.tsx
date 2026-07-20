'use client';

import { useTranslations } from 'next-intl';

type KeyInsightsProps = {
  insightKeys: string[];
};

export function KeyInsights({ insightKeys }: KeyInsightsProps) {
  const t = useTranslations();

  return (
    <div className="ll-consulting-card p-10">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('intelligence.topInsights')}
      </p>
      <ul className="mt-6 space-y-4">
        {insightKeys.map((key) => (
          <li key={key} className="flex gap-3 text-base leading-relaxed">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-consulting-accent" />
            {t(key)}
          </li>
        ))}
      </ul>
    </div>
  );
}
