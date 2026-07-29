import { isDemoWorkspace, requireAuthUser } from '@/lib/auth/server-auth';

type WorkspaceLayoutProps = {
  children: React.ReactNode;
};

/** Personal workspace requires login; demo cookie bypasses auth (Stabilization P0). */
export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  const demoMode = await isDemoWorkspace();
  if (!demoMode) {
    await requireAuthUser('/workspace');
  }
  return children;
}
