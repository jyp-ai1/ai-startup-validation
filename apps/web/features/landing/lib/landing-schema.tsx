import { getTranslations } from 'next-intl/server';

import { env } from '@repo/core/env';

export async function LandingJsonLd() {
  const t = await getTranslations('landing');
  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  const appName = t('meta.title');

  const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'] as const;
  const faqEntities = faqKeys.map((key) => ({
    '@type': 'Question',
    name: t(`faq.${key}.question`),
    acceptedAnswer: {
      '@type': 'Answer',
      text: t(`faq.${key}.answer`),
    },
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: appName,
        url: baseUrl,
        description: t('meta.description'),
      },
      {
        '@type': 'SoftwareApplication',
        name: appName,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description: t('meta.description'),
        url: baseUrl,
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqEntities,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
