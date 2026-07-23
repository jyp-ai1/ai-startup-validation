import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing');
  return {
    title: t('footer.privacy'),
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations('landing.legal');

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">{t('privacyTitle')}</h1>
      <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">{t('privacyBody')}</p>
    </div>
  );
}
