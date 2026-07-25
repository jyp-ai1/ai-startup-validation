/** LaunchLens Closed Beta Release — Execution · History CSV · GO flow · A11y */
export const BETA_VERSION = 'Closed Beta 2.12.0';
export const BETA_LABEL = 'CLOSED BETA';

export const SITE_LINKS = {
  email: 'hello@launchlens.ai',
  github: 'https://github.com/jyp-ai1/ai-startup-validation',
  discord: process.env.NEXT_PUBLIC_DISCORD_URL ?? '',
  bugReport:
    process.env.NEXT_PUBLIC_FEEDBACK_BUG_URL ??
    'https://forms.gle/placeholder-bug-report',
  featureRequest:
    process.env.NEXT_PUBLIC_FEEDBACK_IDEA_URL ??
    'https://forms.gle/placeholder-feature-request',
} as const;
