import { redirect } from 'next/navigation';

/** Legacy `/workspaces` → protected `/workspace` (Sprint 2 P0 IA). */
export default function WorkspacesLegacyRedirect() {
  redirect('/workspace');
}
