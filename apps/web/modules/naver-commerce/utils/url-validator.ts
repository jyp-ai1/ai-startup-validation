import path from 'node:path';

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'file:'] as const;

export type UrlValidationResult =
  | { valid: true; url: string; normalized: string }
  | { valid: false; error: string };

/** Validate and normalize a product source URL. */
export function validateProductUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: '상품 URL을 입력해 주세요.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: '올바른 URL 형식이 아닙니다.' };
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol as (typeof ALLOWED_PROTOCOLS)[number])) {
    return { valid: false, error: 'http, https, file URL만 지원합니다.' };
  }

  return {
    valid: true,
    url: trimmed,
    normalized: parsed.href,
  };
}

/** Resolve crawl target — "test" uses local browser fixture. */
export function resolveCrawlUrl(input: string): string {
  const lower = input.trim().toLowerCase();
  if (!lower || lower === 'test' || lower === 'local') {
    return getLocalTestFixtureUrl();
  }
  const result = validateProductUrl(input);
  if (!result.valid) {
    throw new Error(result.error);
  }
  return result.normalized;
}

/** Local browser test fixture for development and CI. */
export function getLocalTestFixtureUrl(): string {
  const fixturePath = path.join(
    process.cwd(),
    '..',
    '..',
    'packages',
    'browser',
    'src',
    'test-fixtures',
    'test-page.html',
  );
  return `file:///${fixturePath.replace(/\\/g, '/')}`;
}
