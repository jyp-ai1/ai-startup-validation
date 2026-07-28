import { redirect } from 'next/navigation';

import { legacyProjectCanvasRedirect } from '@/lib/legacy-routes';

/** Legacy decision center — redirect to Validation Canvas (Sprint 5.1.1 Epic K). */
export default function DecisionCenterPage() {
  redirect(legacyProjectCanvasRedirect());
}
