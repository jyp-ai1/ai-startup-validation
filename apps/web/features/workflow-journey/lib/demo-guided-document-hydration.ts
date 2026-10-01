import type { DemoSampleId } from './demo-samples';
import { getDemoSample } from './demo-samples';
import type { UnderstandingPhase } from './business-understanding/business-understanding-store';
import { isWorkspaceDocumentAnalyzable } from './business-understanding/workspace-document-eligibility';

/** SaaS preset literal — must never replace a custom CEO document. */
export function isSmartPmSampleDocument(text: string): boolean {
  const t = text.trim();
  return t.startsWith('스마트PM') && t.includes('전략 검토가 회의마다 리셋');
}

export type DemoGuidedHydrationInput = {
  demoSampleId: DemoSampleId;
  demoFresh: boolean;
  customDocumentFromSession: string;
  storedDocument: string;
  hasLoopProgress: boolean;
  understandingPhase: UnderstandingPhase;
};

export type DemoGuidedHydrationDecision =
  | { kind: 'skip_reseed'; reason: 'custom_canonical' | 'in_flow' }
  | { kind: 'apply_sample'; document: string; projectName: string }
  | { kind: 'compose_empty_custom' }
  | { kind: 'redirect_demo_start' };

/**
 * P0-3A — Idempotent demo seed plan.
 * Never overwrite an established custom canonical document with a preset sample.
 */
export function resolveDemoGuidedHydration(
  input: DemoGuidedHydrationInput,
): DemoGuidedHydrationDecision {
  const sessionCustom = input.customDocumentFromSession.trim();
  const stored = input.storedDocument.trim();

  if (input.demoSampleId === 'custom') {
    const canonical = sessionCustom || stored;
    if (canonical.length < 8 || !isWorkspaceDocumentAnalyzable(canonical)) {
      return { kind: 'compose_empty_custom' };
    }

    const storedIsCustomCanonical =
      stored.length >= 8 &&
      isWorkspaceDocumentAnalyzable(stored) &&
      !isSmartPmSampleDocument(stored);

    if (storedIsCustomCanonical) {
      if (input.hasLoopProgress || input.understandingPhase !== 'pending') {
        return { kind: 'skip_reseed', reason: 'in_flow' };
      }
      if (!sessionCustom || sessionCustom === stored) {
        return { kind: 'skip_reseed', reason: 'custom_canonical' };
      }
    }

    const projectName = deriveDemoProjectNameFromDocument(canonical);
    return { kind: 'apply_sample', document: canonical, projectName };
  }

  const sample = getDemoSample(input.demoSampleId);
  if (sample.document.trim().length < 8) {
    return { kind: 'redirect_demo_start' };
  }

  if (
    input.hasLoopProgress &&
    stored.length >= 8 &&
    isWorkspaceDocumentAnalyzable(stored) &&
    !isSmartPmSampleDocument(stored)
  ) {
    return { kind: 'skip_reseed', reason: 'in_flow' };
  }

  return {
    kind: 'apply_sample',
    document: sample.document,
    projectName: sample.projectName,
  };
}

export function deriveDemoProjectNameFromDocument(document: string): string {
  const first =
    document.split('\n')[0]?.replace(/^[#\-\*]\s*/, '').trim() || '';
  if (!first || first.length < 2) return '내 사업 Demo';
  if (first.length <= 36) return first;
  return `${first.slice(0, 33).trim()}…`;
}

/** Whether fresh=1 should wipe demo client state before entry. */
export function shouldWipeDemoClientOnFresh(input: {
  demoFresh: boolean;
  hasLoopProgress: boolean;
}): boolean {
  return input.demoFresh && !input.hasLoopProgress;
}
