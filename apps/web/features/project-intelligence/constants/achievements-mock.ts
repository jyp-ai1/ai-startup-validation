export type AchievementBadge = {
  id: string;
  labelKey: string;
  progress: number;
  target: number;
  unlocked: boolean;
};

export const ACHIEVEMENTS: AchievementBadge[] = [
  { id: 'voc-3', labelKey: 'voc3', progress: 1, target: 3, unlocked: false },
  { id: 'conf-80', labelKey: 'conf80', progress: 62, target: 80, unlocked: false },
  { id: 'first-go', labelKey: 'firstGo', progress: 0, target: 1, unlocked: false },
];
