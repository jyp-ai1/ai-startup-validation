/** Application-wide shared constants. */

export const APP_NAME = 'LaunchLens' as const;

export const APP_TAGLINE = 'AI Startup Intelligence Platform' as const;

export const LEGACY_FRAMEWORK_NAME = 'AI Startup Validation Framework' as const;

export const APP_DESCRIPTION =
  'AI-powered startup intelligence and validation platform' as const;

export const DEFAULT_LOCALE = 'ko' as const;

/** Theme modes supported by the design system. */
export const THEME_MODES = ['light', 'dark', 'system'] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

/** Breakpoints aligned with Tailwind defaults (px). */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;
