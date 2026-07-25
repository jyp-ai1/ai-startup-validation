import type { AchievementBadge } from '@/features/project-intelligence/constants/achievements-mock';
import { ACHIEVEMENTS } from '@/features/project-intelligence/constants/achievements-mock';

const STORAGE_KEY = 'll_achievements_v1';

type StoredProgress = Record<string, { progress: number; unlocked: boolean }>;

function readStored(): StoredProgress {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredProgress) : {};
  } catch {
    return {};
  }
}

function writeStored(data: StoredProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAchievementsState(): AchievementBadge[] {
  const stored = readStored();
  return ACHIEVEMENTS.map((badge) => {
    const saved = stored[badge.id];
    if (!saved) return badge;
    return {
      ...badge,
      progress: saved.progress,
      unlocked: saved.unlocked,
    };
  });
}

export function unlockAchievement(id: string, progress?: number): void {
  const stored = readStored();
  const base = ACHIEVEMENTS.find((b) => b.id === id);
  if (!base) return;
  stored[id] = {
    progress: progress ?? base.target,
    unlocked: true,
  };
  writeStored(stored);
  window.dispatchEvent(new CustomEvent('ll-achievements-changed'));
}

export function bumpAchievementProgress(id: string, delta: number): void {
  const stored = readStored();
  const base = ACHIEVEMENTS.find((b) => b.id === id);
  if (!base) return;
  const current = stored[id]?.progress ?? base.progress;
  const next = Math.min(base.target, current + delta);
  stored[id] = {
    progress: next,
    unlocked: next >= base.target,
  };
  writeStored(stored);
  window.dispatchEvent(new CustomEvent('ll-achievements-changed'));
}
