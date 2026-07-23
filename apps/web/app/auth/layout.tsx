import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { AnalyticsProvider } from '@/lib/analytics/providers/analytics-provider';
import { ThemeProvider } from '@repo/ui';

type AuthLayoutProps = {
  children: React.ReactNode;
};

/** Auth routes sit outside `[locale]` — provide i18n + theme here. */
export default async function AuthLayout({ children }: AuthLayoutProps) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
