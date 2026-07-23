'use client';

import { useTranslations } from 'next-intl';

import { saveNotificationSettings } from '../actions/watch-center-actions';
import type { NotificationSettings } from '../types';

type NotificationSettingsPanelProps = {
  projectId: string;
  userId?: string | null;
  settings: NotificationSettings;
  onChange?: (settings: NotificationSettings) => void;
};

const SETTING_KEYS = [
  { key: 'marketEnabled' as const, labelKey: 'settings.market' },
  { key: 'competitorEnabled' as const, labelKey: 'settings.competitor' },
  { key: 'governmentEnabled' as const, labelKey: 'settings.government' },
  { key: 'reminderEnabled' as const, labelKey: 'settings.reminder' },
  { key: 'aiRecommendationEnabled' as const, labelKey: 'settings.aiRecommendation' },
];

export function NotificationSettingsPanel({
  projectId,
  userId,
  settings,
  onChange,
}: NotificationSettingsPanelProps) {
  const t = useTranslations('watch');

  async function toggle(key: keyof Omit<NotificationSettings, 'projectId'>) {
    const next = await saveNotificationSettings(projectId, userId, {
      [key]: !settings[key],
    });
    onChange?.(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('settings.desc')}</p>
      <ul className="space-y-2">
        {SETTING_KEYS.map(({ key, labelKey }) => (
          <li
            key={key}
            className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3"
          >
            <span className="text-sm font-medium">{t(labelKey)}</span>
            <button
              type="button"
              role="switch"
              aria-checked={settings[key]}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings[key] ? 'bg-primary' : 'bg-muted'
              }`}
              onClick={() => void toggle(key)}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform ${
                  settings[key] ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
