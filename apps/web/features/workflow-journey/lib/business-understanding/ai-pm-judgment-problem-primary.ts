/**
 * DAY 8-I P0 FIX-9 — Problem primary text helpers (structured + legacy summaries).
 */

/** Extract PRIMARY line text from structured or legacy problem summary. */
export function extractProblemPrimaryText(summary: string): string {
  const trimmed = summary.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/PRIMARY:\s*(.+?)(?:\n|$)/);
  if (match?.[1]) return match[1].trim();
  return trimmed.split(/\s*·\s*/)[0]?.trim() ?? trimmed;
}

/** True when two problem summaries represent the same primary claim. */
export function problemPrimaryEquivalent(a: string, b: string): boolean {
  const pa = extractProblemPrimaryText(a);
  const pb = extractProblemPrimaryText(b);
  if (!pa || !pb) return pa === pb;
  if (pa === pb) return true;
  return pa.includes(pb) || pb.includes(pa);
}
