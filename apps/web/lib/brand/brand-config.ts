/**
 * ALABOM display brand — single source of truth for wordmark, assets, and EN taglines.
 * Localized copy lives in packages/i18n (`meta.*`, `landing.nav.*`, `landing.hero.*`).
 *
 * Brand Concept 3 — The Progressive Loop (orange→coral continuous "al" mark).
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
  /** Progressive Loop theme line (EN) */
  themeLine: string;
  /** Slogan vibe (EN) */
  slogan: string;
  /** Mark-only asset path (al loop) */
  logo: string;
  /** Wordmark asset (mark + ALABOM + 알아봄) */
  wordmark: string;
  /** Favicon / apple icon path (al loop on light gray square) */
  favicon: string;
  /** Primary brand hue (CSS) */
  primaryColor: string;
  /** Coral accent (CSS) */
  accentColor: string;
};

export const BRAND_CONFIG = {
  displayName: 'ALABOM',
  name: 'ALABOM',
  shortName: '알아봄',
  tagline: '사업, 시작하기 전에 알아봄.',
  secondaryTagline: 'Know Before You Build.',
  themeLine:
    "ALABOM doesn't just analyze; it reasons. See what's KNOWN and what's next.",
  slogan: 'AI processing you can trust, one step ahead.',
  logo: '/brand/alabom-mark.svg',
  wordmark: '/brand/alabom-wordmark.svg',
  favicon: '/icon.svg',
  primaryColor: '#F97316',
  accentColor: '#F43F5E',
} as const satisfies BrandConfig;

export type BrandConfigValue = typeof BRAND_CONFIG;
