/** Open Beta site constants — L3.3 */
export const BETA_VERSION = 'v0.9';
export const BETA_LABEL = 'PRIVATE BETA';

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
