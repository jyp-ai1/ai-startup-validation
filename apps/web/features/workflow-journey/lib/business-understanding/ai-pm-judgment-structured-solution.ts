/**
 * DAY 8-I P0 FIX-5 — Structured solution judgment (not raw sentence append).
 */

import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  type CeoJudgmentDimension,
} from './ai-pm-ceo-judgment-dimensions';
import { isSemanticCopy } from './ai-pm-judgment-target-binding';
import { isAiPmJudgmentFix5V1Active } from './ai-pm-judgment-fix5-v1';

export type SolutionLayers = {
  approach?: string;
  keyFeature?: string;
  mvpScope?: string;
};

function clip(text: string, max = 96): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function classifySolutionLayer(text: string): keyof SolutionLayers {
  const t = text.trim();
  if (/MVP|체크리스트|주문\s*입력|제공할\s*계획/.test(t)) return 'mvpScope';
  if (/모바일|한눈에|핵심/.test(t)) return 'keyFeature';
  return 'approach';
}

export function renderSolutionJudgment(layers: SolutionLayers): string {
  const segs: string[] = [];
  if (layers.approach?.trim()) segs.push(layers.approach.trim().replace(/\.$/, ''));
  if (layers.keyFeature?.trim()) {
    const k = layers.keyFeature.trim().replace(/\.$/, '');
    segs.push(/핵심/.test(k) ? k : `핵심: ${k}`);
  }
  if (layers.mvpScope?.trim()) {
    const m = layers.mvpScope.trim().replace(/\.$/, '');
    segs.push(/^MVP/.test(m) ? m : `MVP: ${m}`);
  }
  if (segs.length === 0) return '';
  if (segs.length === 1) return clip(segs[0]!);
  return clip(segs.join(' — '));
}

function layersFromLegacySummary(summary: string): SolutionLayers {
  const layers: SolutionLayers = {};
  const parts = summary
    .replace(/…$/, '')
    .split(/\s*(?:·|—)\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 4);

  for (const part of parts) {
    const layer = classifySolutionLayer(part);
    if (!layers[layer] || part.length > (layers[layer]?.length ?? 0)) {
      layers[layer] = part;
    }
  }
  if (Object.keys(layers).length === 0 && summary.trim()) {
    layers.approach = summary.trim();
  }
  return layers;
}

function isDuplicateLayer(existing: string | undefined, incoming: string): boolean {
  if (!existing?.trim()) return false;
  return isSemanticCopy(existing, incoming);
}

/**
 * Merge incoming CEO solution fact into layered judgment — replaces same layer, renders one summary.
 */
export function mergeStructuredSolutionDimension(
  prior: CeoJudgmentDimension,
  nextSummary: string,
): CeoJudgmentDimension {
  if (!isAiPmJudgmentFix5V1Active()) {
    return prior;
  }

  const incoming = nextSummary.trim();
  if (!incoming) return prior;

  if (!prior.summary.trim() && !prior.solutionLayers) {
    const layerKey = classifySolutionLayer(incoming);
    const layers: SolutionLayers = { [layerKey]: incoming };
    return {
      ...prior,
      label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
      status: 'needs_check',
      summary: renderSolutionJudgment(layers),
      solutionLayers: layers,
      statusReason: 'CEO 답변에서 첫 해결 방법 evidence',
    };
  }

  const layers: SolutionLayers = prior.solutionLayers
    ? { ...prior.solutionLayers }
    : layersFromLegacySummary(prior.summary);

  const layerKey = classifySolutionLayer(incoming);
  if (isDuplicateLayer(layers[layerKey], incoming)) {
    return {
      ...prior,
      label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
      summary: renderSolutionJudgment(layers),
      solutionLayers: layers,
      statusReason: 'CEO 답변 — 기존 해결 방법 판단과 동일',
    };
  }

  layers[layerKey] = incoming;
  const rendered = renderSolutionJudgment(layers);

  return {
    ...prior,
    label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
    status: prior.status === 'unknown' ? 'needs_check' : prior.status,
    summary: rendered,
    solutionLayers: layers,
    statusReason: 'CEO 답변 — 해결 방법 구조화 판단 갱신',
  };
}

/** Detect raw append pattern (multiple unrelated sentences joined with ·). */
export function isRawSolutionAppend(summary: string): boolean {
  const parts = summary.split(/\s*·\s*/).filter((p) => p.trim().length >= 8);
  return parts.length >= 3;
}
