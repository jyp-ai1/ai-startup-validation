'use client';

import { useEffect, useState } from 'react';

import { ACHIEVEMENTS } from '@/features/project-intelligence/constants/achievements-mock';

import { getAchievementsState } from '../lib/journey-achievements-store';

export function useAchievements(): typeof ACHIEVEMENTS {
  const [badges, setBadges] = useState(() =>
    typeof window === 'undefined' ? ACHIEVEMENTS : getAchievementsState(),
  );

  useEffect(() => {
    setBadges(getAchievementsState());
    function refresh() {
      setBadges(getAchievementsState());
    }
    window.addEventListener('ll-achievements-changed', refresh);
    return () => window.removeEventListener('ll-achievements-changed', refresh);
  }, []);

  return badges.length > 0 ? badges : ACHIEVEMENTS;
}
