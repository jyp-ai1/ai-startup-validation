import { requireAuthUser } from '@/lib/auth/server-auth';

type MyProjectsLayoutProps = {
  children: React.ReactNode;
};

/** Sprint 1.1 — authenticated project home (protected route). */
export default async function MyProjectsLayout({ children }: MyProjectsLayoutProps) {
  await requireAuthUser('/my-projects');
  return children;
}
