/**
 * S14 — Analysis result persistence (Engine output only).
 */
import type { AnalysisResult } from '@/lib/analysis-engine/types';

const PREFIX = 'launchlens.s14.analysisResult.';

function key(projectId?: string): string {
  return `${PREFIX}${projectId?.trim() || 'default'}`;
}

export function loadAnalysisResult(projectId?: string): AnalysisResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as AnalysisResult;
  } catch {
    return null;
  }
}

export function saveAnalysisResult(result: AnalysisResult, projectId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key(projectId), JSON.stringify(result));
  } catch {
    // ignore quota
  }
}

export function clearAnalysisResult(projectId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key(projectId));
  } catch {
    // ignore
  }
}

export function hasAnalysisResult(projectId?: string): boolean {
  return loadAnalysisResult(projectId) != null;
}
