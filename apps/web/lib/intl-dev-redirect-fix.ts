import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { DEFAULT_LOCALE, LOCALES } from '@repo/i18n/config';

function hasLocalePrefix(pathname: string): boolean {
  const segment = pathname.split('/').filter(Boolean)[0];
  return segment !== undefined && (LOCALES as readonly string[]).includes(segment);
}

function toExternalPathname(pathname: string): string {
  if (!hasLocalePrefix(pathname)) {
    return pathname;
  }
  const rest = pathname.split('/').filter(Boolean).slice(1).join('/');
  return rest ? `/${rest}` : '/';
}

function toInternalPathname(pathname: string, locale: string = DEFAULT_LOCALE): string {
  if (hasLocalePrefix(pathname)) {
    return pathname;
  }
  return pathname === '/' ? `/${locale}` : `/${locale}${pathname}`;
}

/**
 * next-intl with localePrefix: 'never' can emit a 307 to the same external path
 * while routing internally to /[locale]/…. Browsers follow Location and loop;
 * convert that case to an internal rewrite.
 */
export function resolveIntlSamePathRedirectLoop(
  request: NextRequest,
  intlResponse: NextResponse,
  originalPathname: string,
): NextResponse | null {
  if (intlResponse.status < 300 || intlResponse.status >= 400) {
    return null;
  }

  const location = intlResponse.headers.get('location');
  if (!location) {
    return null;
  }

  const locationUrl = new URL(location, request.url);
  const externalPathname = toExternalPathname(originalPathname);

  if (locationUrl.pathname !== externalPathname) {
    return null;
  }
  if (locationUrl.search !== request.nextUrl.search) {
    return null;
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = toInternalPathname(externalPathname);

  const response = NextResponse.rewrite(rewriteUrl);

  for (const cookie of intlResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }

  for (const [key, value] of intlResponse.headers.entries()) {
    if (key.toLowerCase() === 'location') {
      continue;
    }
    response.headers.set(key, value);
  }

  return response;
}
