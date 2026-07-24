/** Paths that render without workspace shell or session bootstrap — L3.4 perf */
const MARKETING_PATHS = new Set(['/', '/about', '/privacy', '/terms']);

export function isMarketingPath(pathname: string): boolean {
  const path = pathname.split('?')[0]?.split('#')[0] ?? '/';
  return MARKETING_PATHS.has(path || '/');
}
