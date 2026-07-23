import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, setRequestLocale } from 'next-intl/server';

import { AnalyticsProvider } from '@/lib/analytics/providers/analytics-provider';
import { AppShell } from '@/components/app-shell';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from '@repo/ui';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Cookie-based locale must resolve per request — avoid stale SSG bundles. */
export const dynamic = 'force-dynamic';

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const resolvedLocale = await getLocale();
  setRequestLocale(resolvedLocale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={resolvedLocale} messages={messages}>
      <ThemeProvider>
        <AnalyticsProvider>
          <AppShell>{children}</AppShell>
        </AnalyticsProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
