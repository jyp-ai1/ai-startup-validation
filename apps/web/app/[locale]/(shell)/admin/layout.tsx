import { requireAdminUser } from '@/lib/auth/server-auth';

type AdminLayoutProps = {
  children: React.ReactNode;
};

/** Sprint 4.8 — ADMIN_EMAIL allowlist; no hardcoded credentials. */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminUser();
  return children;
}
