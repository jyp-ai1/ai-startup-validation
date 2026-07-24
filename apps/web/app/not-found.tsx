import { ErrorPageView } from '@/components/error-page-view';
import { getErrorCopy } from '@/lib/i18n/error-copy';

export default async function NotFound() {
  const copy = await getErrorCopy({
    title: 'errors.notFoundTitle',
    description: 'errors.notFoundDescription',
    action: 'errors.backToHome',
  });

  return (
    <ErrorPageView
      code="404"
      title={copy.title}
      description={copy.description}
      actionLabel={copy.action}
      actionHref="/"
    />
  );
}
