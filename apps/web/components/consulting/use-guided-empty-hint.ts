'use client';

import { useTranslations } from 'next-intl';

export type GuidedEmptySection =
  | 'research'
  | 'evidence'
  | 'competitor'
  | 'government'
  | 'decision'
  | 'report'
  | 'memory'
  | 'notification';

export function useGuidedEmptyHint(section: GuidedEmptySection): {
  aiHint: string;
  aiGuideLabel: string;
} {
  const t = useTranslations('polish.emptySections');

  return {
    aiHint: t(`${section}.hint`),
    aiGuideLabel: t('aiGuide'),
  };
}
