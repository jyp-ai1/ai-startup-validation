import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, setRequestLocale } from 'next-intl/server';

import { AnalyticsProvider } from '@/lib/analytics/providers/analytics-provider';
import { AppShellWrapper } from '@/components/app-shell-wrapper';
import { routing } from '@/i18n/routing';
import { ThemeProvider, Toaster } from '@repo/ui';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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
          <AppShellWrapper>{children}</AppShellWrapper>
          <Toaster position="top-right" richColors closeButton />
        </AnalyticsProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
