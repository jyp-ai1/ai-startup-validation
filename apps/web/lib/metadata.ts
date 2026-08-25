/** Build consistent page titles using the ALABOM brand suffix. */
export function buildPageTitle(page: string, suffix: string): string {
  return `${page} | ${suffix}`;
}
