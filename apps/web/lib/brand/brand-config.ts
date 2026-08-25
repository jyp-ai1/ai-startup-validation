/**
 * ALABOM display brand — single source of truth for wordmark, assets, and EN taglines.
 * Localized copy lives in packages/i18n (`meta.*`, `landing.nav.*`, `landing.hero.*`).
 *
 * Do NOT rename launchlens.* storage / analytics keys or businessPlan.generate internals.
 */
export type BrandConfig = {
  /** Primary EN display name */
  displayName: string;
  /** Alias of displayName (Scope Freeze shape) */
  name: string;
  /** Compact / PWA short_name (KO mark) */
  shortName: string;
  /** Primary descriptor (KO) */
  tagline: string;
  /** Secondary EN line */
  secondaryTagline: string;
  /** Mark asset path */
  logo: string;
  /** Favicon / apple icon path */
  favicon: string;
};

export const BRAND_CONFIG = {
  displayName: 'ALABOM',
  name: 'ALABOM',
  shortName: '알아봄',
  tagline: '사업, 시작하기 전에 알아봄.',
  secondaryTagline: 'Know Before You Build.',
  logo: '/icon.svg',
  favicon: '/icon.svg',
} as const satisfies BrandConfig;

export type BrandConfigValue = typeof BRAND_CONFIG;
