import { getTranslations } from 'next-intl/server';

import type { InterviewContextSnapshot } from '../types/interview-state';

type InterviewContextPanelProps = {
  context: InterviewContextSnapshot;
  autoSaved?: boolean;
};

export async function InterviewContextPanel({
  context,
  autoSaved = false,
}: InterviewContextPanelProps) {
  const t = await getTranslations('interview.context');

  const items = [
    { key: 'problem', value: context.problem },
    { key: 'customer', value: context.customer },
    { key: 'value', value: context.value },
    { key: 'hypothesis', value: context.hypothesis },
  ] as const;

  return (
    <aside className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
        <div className="mt-3 border-t border-border/70" />
      </div>
      <ul className="space-y-5">
        {items.map((item) => (
          <li key={item.key}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t(item.key)}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
              {item.value?.trim() ? item.value : t('empty')}
            </p>
          </li>
        ))}
      </ul>
      {autoSaved ? (
        <p className="text-xs text-muted-foreground/80">{t('autoSaved')}</p>
      ) : null}
    </aside>
  );
}
