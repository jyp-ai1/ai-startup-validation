import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

import { DeferredAppShell } from '@/components/deferred-app-shell';
import { SkipToMainLink } from '@/components/skip-to-main';
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
        <DeferredAppShell>{children}</DeferredAppShell>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
