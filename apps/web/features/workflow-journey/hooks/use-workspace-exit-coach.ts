'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { DAILY_COACH } from '@/features/project-intelligence/constants/daily-coach';
import { toast } from '@repo/ui';

const EXIT_FLAG = 'll_workspace_exit_shown';

export function useWorkspaceExitCoach(enabled: boolean) {
  const t = useTranslations('workflow.epic3.coach');

  useEffect(() => {
    if (!enabled) return;

    const showExit = () => {
      if (sessionStorage.getItem(EXIT_FLAG) === '1') return;
      sessionStorage.setItem(EXIT_FLAG, '1');
      toast.info(t('exitSummary', { gain: DAILY_COACH.todayGain }), {
        description: t('exitNext', { topic: t('exitTopics.pricing') }),
        duration: 6000,
      });
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      if (href.startsWith('/workspace') || href === '#') return;
      showExit();
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled, t]);
}
