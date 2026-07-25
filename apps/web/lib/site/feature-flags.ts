'use client';

import { useCallback, useEffect, useState } from 'react';

export type FeatureFlagKey =
  | 'closed_beta_banner'
  | 'journey_immersion'
  | 'go_celebration_v2';

export type FeatureFlag = { key: FeatureFlagKey; enabled: boolean };

const STORAGE_KEY = 'launchlens:feature-flags';

export const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  { key: 'closed_beta_banner', enabled: true },
  { key: 'journey_immersion', enabled: true },
  { key: 'go_celebration_v2', enabled: false },
];

function readStoredFlags(): FeatureFlag[] {
  if (typeof window === 'undefined') return DEFAULT_FEATURE_FLAGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FEATURE_FLAGS;

    const parsed = JSON.parse(raw) as Partial<Record<FeatureFlagKey, boolean>>;
    return DEFAULT_FEATURE_FLAGS.map((flag) => ({
      ...flag,
      enabled: parsed[flag.key] ?? flag.enabled,
    }));
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
}

export function getFeatureFlags(): FeatureFlag[] {
  return readStoredFlags();
}

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return readStoredFlags().find((f) => f.key === key)?.enabled ?? false;
}

export function setFeatureFlag(key: FeatureFlagKey, enabled: boolean): void {
  if (typeof window === 'undefined') return;

  const next = readStoredFlags().map((flag) =>
    flag.key === key ? { ...flag, enabled } : flag,
  );
  const record = Object.fromEntries(next.map((f) => [f.key, f.enabled])) as Record<
    FeatureFlagKey,
    boolean
  >;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent('launchlens:feature-flags'));
}

export function useFeatureFlags(): [FeatureFlag[], (key: FeatureFlagKey, enabled: boolean) => void] {
  const [flags, setFlags] = useState<FeatureFlag[]>(DEFAULT_FEATURE_FLAGS);

  useEffect(() => {
    setFlags(readStoredFlags());

    function sync() {
      setFlags(readStoredFlags());
    }

    window.addEventListener('launchlens:feature-flags', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('launchlens:feature-flags', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const updateFlag = useCallback((key: FeatureFlagKey, enabled: boolean) => {
    setFeatureFlag(key, enabled);
    setFlags(readStoredFlags());
  }, []);

  return [flags, updateFlag];
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const [enabled, setEnabled] = useState(() =>
    typeof window !== 'undefined' ? isFeatureEnabled(key) : DEFAULT_FEATURE_FLAGS.find((f) => f.key === key)!.enabled,
  );

  useEffect(() => {
    setEnabled(isFeatureEnabled(key));

    function sync() {
      setEnabled(isFeatureEnabled(key));
    }

    window.addEventListener('launchlens:feature-flags', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('launchlens:feature-flags', sync);
      window.removeEventListener('storage', sync);
    };
  }, [key]);

  return enabled;
}
