/** Theme mode for UI and user preferences. */
export type Theme = 'light' | 'dark' | 'system';

export const THEMES = ['light', 'dark', 'system'] as const satisfies readonly Theme[];

/** Resolved theme after applying system preference. */
export type ResolvedTheme = 'light' | 'dark';
