import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

import { ClientChrome } from '@/components/client-chrome';
import { SkipToMainLink } from '@/components/skip-to-main';
import { AnalyticsProvider } from '@/lib/analytics/providers/analytics-provider';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from '@repo/ui';

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

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>
        <SkipToMainLink />
        <AnalyticsProvider>
          {children}
          <ClientChrome />
        </AnalyticsProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
