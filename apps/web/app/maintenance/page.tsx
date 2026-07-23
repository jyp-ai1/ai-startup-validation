import Link from 'next/link';

import { Button } from '@repo/ui';
import { getErrorCopy } from '@/lib/i18n/error-copy';

export default async function MaintenancePage() {
  const copy = await getErrorCopy({
    title: 'errors.maintenanceTitle',
    description: 'errors.maintenanceDescription',
    action: 'errors.backToHome',
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">503</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{copy.description}</p>
        <Button className="mt-8" asChild>
          <Link href="/">{copy.action}</Link>
        </Button>
      </div>
    </div>
  );
}
