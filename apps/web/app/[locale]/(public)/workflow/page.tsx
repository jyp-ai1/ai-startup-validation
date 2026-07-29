import { redirect } from 'next/navigation';

/** Legacy /workflow — onboarding removed; workspace is canonical. */
export default async function WorkflowPage() {
  redirect('/workspace');
}
