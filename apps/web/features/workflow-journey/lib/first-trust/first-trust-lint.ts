import {
  NEXT_ACTION_MARKERS,
  SPECULATIVE_PATTERNS,
  ZERO_LIE_PHRASES,
} from './zero-lie-corpus';

export type FirstTrustLintResult = {
  ok: boolean;
  violations: string[];
};

export function lintFirstTrustCopy(text: string): FirstTrustLintResult {
  const violations: string[] = [];
  const normalized = text.trim();

  if (!normalized) {
    return { ok: false, violations: ['empty copy'] };
  }

  for (const phrase of ZERO_LIE_PHRASES) {
    if (normalized.includes(phrase)) {
      violations.push(`corpus: "${phrase}"`);
    }
  }

  for (const pattern of SPECULATIVE_PATTERNS) {
    if (pattern.test(normalized)) {
      violations.push(`speculative: ${pattern.source}`);
    }
  }

  const hasNextAction = NEXT_ACTION_MARKERS.some((m) => normalized.includes(m));
  if (!hasNextAction) {
    violations.push('missing next action');
  }

  return { ok: violations.length === 0, violations };
}

/** One claim per paragraph — reject paragraphs with multiple "하고/며/지만" chains. */
export function lintParagraphStructure(paragraphs: string[]): FirstTrustLintResult {
  const violations: string[] = [];

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed || trimmed.startsWith('✓') || trimmed.startsWith('□') || trimmed === '근거' || trimmed.startsWith('확인')) {
      continue;
    }
    const claimMarkers = (trimmed.match(/(하고|하며|지만|그리고|또한)/g) ?? []).length;
    if (claimMarkers >= 2) {
      violations.push(`multi-claim paragraph: "${trimmed.slice(0, 40)}…"`);
    }
  }

  return { ok: violations.length === 0, violations };
}

export function assertFirstTrustCopy(text: string): void {
  const result = lintFirstTrustCopy(text);
  if (!result.ok) {
    throw new Error(`First Trust lint failed: ${result.violations.join(', ')}`);
  }
}
