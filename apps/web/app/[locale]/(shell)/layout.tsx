import { AppShellWrapper } from '@/components/app-shell-wrapper';

type ShellLayoutProps = {
  children: React.ReactNode;
};

/** App routes — loads workspace session + sidebar (dynamic). */
export default function ShellLayout({ children }: ShellLayoutProps) {
  return <AppShellWrapper>{children}</AppShellWrapper>;
}
