type PublicLayoutProps = {
  children: React.ReactNode;
};

/** Marketing + journey routes — static-friendly, no workspace session. */
export default function PublicLayout({ children }: PublicLayoutProps) {
  return children;
}
