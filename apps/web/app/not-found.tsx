import Link from 'next/link';

import { Button } from '@repo/ui';
import { getErrorCopy } from '@/lib/i18n/error-copy';

export default async function NotFound() {
  const copy = await getErrorCopy({
    title: 'errors.notFoundTitle',
    description: 'errors.notFoundDescription',
    action: 'errors.backToHome',
  });

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{copy.description}</p>
      <Button className="mt-8" asChild>
        <Link href="/">{copy.action}</Link>
      </Button>
    </div>
  );
}
