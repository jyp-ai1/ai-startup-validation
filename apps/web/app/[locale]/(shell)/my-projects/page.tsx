import { redirect } from 'next/navigation';

/** Legacy list URL — unified at /workspace (Sprint 5.1.3). */
export default function MyProjectsPage() {
  redirect('/workspace');
}
