import { demoCustomDocumentKey } from './demo-samples';
import { loadWorkspaceDocumentText } from './workspace-ai-pm-messages';
import { isWorkspaceDocumentAnalyzable } from './business-understanding/workspace-document-eligibility';

/** Keep session custom key aligned with canonical workspace document (demo only). */
export function syncDemoCustomDocumentKey(projectId: string): void {
  if (typeof window === 'undefined') return;
  const doc = loadWorkspaceDocumentText(projectId)?.trim() ?? '';
  if (!isWorkspaceDocumentAnalyzable(doc)) return;
  sessionStorage.setItem(demoCustomDocumentKey(projectId), doc);
}
