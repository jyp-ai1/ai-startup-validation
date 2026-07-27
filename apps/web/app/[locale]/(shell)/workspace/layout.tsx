import { requireAuthUser } from '@/lib/auth/server-auth';

type WorkspaceLayoutProps = {
  children: React.ReactNode;
};

/** Protected — login required (Sprint 2 P0 IA). */
export default async function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  await requireAuthUser('/workspace');
  return children;
}
