import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getLocale, getTranslations } from 'next-intl/server';

import { env } from '@repo/core/env';
import { isAppLocale, type AppLocale } from '@repo/i18n/config';

import { buildLocaleAlternates, buildOpenGraphLocale } from '@/lib/i18n/locale-seo';

import '@repo/ui/globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  const localeRaw = await getLocale();
  const locale: AppLocale = isAppLocale(localeRaw) ? localeRaw : 'ko';
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const ogLocale = buildOpenGraphLocale(locale);

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: t('appName'),
      template: `%s | ${t('titleSuffix')}`,
    },
    description: t('appDescription'),
    applicationName: t('appName'),
    openGraph: {
      type: 'website',
      locale: ogLocale.locale,
      alternateLocale: ogLocale.alternateLocale,
      url: baseUrl,
      siteName: t('appName'),
      title: t('appName'),
      description: t('appDescription'),
    },
    twitter: {
      card: 'summary_large_image',
      title: t('appName'),
      description: t('appDescription'),
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: buildLocaleAlternates(baseUrl),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
