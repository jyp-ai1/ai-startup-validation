import { headers } from 'next/headers';

import { isDemoWorkspace, requireAuthUser } from '@/lib/auth/server-auth';

type WorkspaceLayoutProps = {
  children: React.ReactNode;
};

/** Personal workspace requires login; demo cookie or demo query bypasses auth (Stabilization P0). */
export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const demoHeader = (await headers()).get('x-workspace-demo') === '1';
  const demoMode = demoHeader || (await isDemoWorkspace());
  if (!demoMode) {
    await requireAuthUser('/workspace');
  }
  return children;
}
