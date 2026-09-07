/**
 * DAY 8-I P0 FIX-5 — Structured solution judgment (not raw sentence append).
 */

import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  type CeoJudgmentDimension,
  type SolutionLayerEvidence,
} from './ai-pm-ceo-judgment-dimensions';
import { isSemanticCopy } from './ai-pm-judgment-target-binding';
import { isAiPmJudgmentFix5V1Active } from './ai-pm-judgment-fix5-v1';
import { isAiPmJudgmentFix6V1Active } from './ai-pm-judgment-fix6-v1';
import { isAiPmJudgmentFix7V1Active } from './ai-pm-judgment-fix7-v1';
import { applyEvidenceToDimension } from './ai-pm-judgment-evidence-model';

export type SolutionLayers = {
  approach?: string;
  keyFeature?: string;
  mvpScope?: string;
};

export type { SolutionLayerEvidence };

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

/** CEO-visible structured solution bullets (FIX-6). */
export function renderSolutionJudgmentStructured(layers: SolutionLayers): string {
  const lines: string[] = [];
  if (layers.approach?.trim()) {
    lines.push(`- 접근: ${layers.approach.trim().replace(/\.$/, '')}`);
  }
  if (layers.keyFeature?.trim()) {
    const k = layers.keyFeature.trim().replace(/\.$/, '');
    lines.push(`- 핵심 기능: ${k.replace(/^핵심:\s*/, '')}`);
  }
  if (layers.mvpScope?.trim()) {
    const m = layers.mvpScope.trim().replace(/\.$/, '').replace(/^MVP(?:는|:)?\s*/, '');
    lines.push(`- MVP: ${m}`);
  }
  if (lines.length === 0) return '';
  return lines.join('\n');
}

export function layersFromLegacySummary(summary: string): SolutionLayers {
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

function normalizeSolutionText(text: string): string {
  return text
    .replace(/(?:를\s*)?만들려(?:고|는)?\s*합니다\.?$/i, '')
    .replace(/입니다\.?$/i, '')
    .trim();
}

function isDuplicateLayer(existing: string | undefined, incoming: string): boolean {
  if (!existing?.trim()) return false;
  if (isSemanticCopy(existing, incoming)) return true;
  return isSemanticCopy(normalizeSolutionText(existing), normalizeSolutionText(incoming));
}

/**
 * Merge incoming CEO solution fact into layered judgment — replaces same layer, renders one summary.
 */
export function mergeStructuredSolutionDimension(
  prior: CeoJudgmentDimension,
  nextSummary: string,
  sourceTurnIndex?: number,
): CeoJudgmentDimension {
  if (!isAiPmJudgmentFix5V1Active()) {
    return prior;
  }

  const incoming = nextSummary.trim();
  if (!incoming) return prior;

  const upsertLayerEvidence = (
    dim: CeoJudgmentDimension,
    layerKey: keyof SolutionLayers,
    span: string,
  ): CeoJudgmentDimension => {
    if (!isAiPmJudgmentFix7V1Active() || !sourceTurnIndex) return dim;
    const existing = [...(dim.solutionLayerEvidence ?? [])];
    const idx = existing.findIndex((e) => e.layer === layerKey);
    if (idx >= 0) {
      return dim;
    }
    const entry: SolutionLayerEvidence = {
      layer: layerKey,
      evidenceSpan: span,
      sourceTurnIndex,
    };
    if (idx >= 0) existing[idx] = entry;
    else existing.push(entry);
    return { ...dim, solutionLayerEvidence: existing };
  };

  if (!prior.summary.trim() && !prior.solutionLayers) {
    const layerKey = classifySolutionLayer(incoming);
    const layers: SolutionLayers = { [layerKey]: incoming };
    const rendered = renderSolutionJudgment(layers);
    const structured = renderSolutionJudgmentStructured(layers);
    const merged: CeoJudgmentDimension = {
      ...prior,
      label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
      status: 'needs_check',
      summary: isAiPmJudgmentFix6V1Active() ? structured : rendered,
      solutionLayers: layers,
      statusReason: 'CEO 답변에서 첫 해결 방법 evidence',
    };
    if (isAiPmJudgmentFix6V1Active()) {
      let withEvidence = applyEvidenceToDimension(merged, {
        conclusion: rendered,
        summary: structured,
        records: [
          {
            span: incoming,
            meaning: incoming,
            role: 'primary',
            sourceTurnIndex,
            layerKey,
          },
        ],
        sourceTurnIndex,
      });
      withEvidence = upsertLayerEvidence(withEvidence, layerKey, incoming);
      return withEvidence;
    }
    return merged;
  }

  const layers: SolutionLayers = prior.solutionLayers
    ? { ...prior.solutionLayers }
    : layersFromLegacySummary(prior.summary);

  const layerKey = classifySolutionLayer(incoming);
  if (layers[layerKey] && isDuplicateLayer(layers[layerKey], incoming)) {
    return {
      ...prior,
      label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
      summary: isAiPmJudgmentFix6V1Active() ? renderSolutionJudgmentStructured(layers) : renderSolutionJudgment(layers),
      solutionLayers: layers,
      statusReason: 'CEO 답변 — 기존 해결 방법 판단과 동일',
    };
  }

  layers[layerKey] = incoming;
  const rendered = renderSolutionJudgment(layers);
  const structured = renderSolutionJudgmentStructured(layers);

  const merged: CeoJudgmentDimension = {
    ...prior,
    label: CEO_JUDGMENT_DIMENSION_LABELS.solution,
    status: prior.status === 'unknown' ? 'needs_check' : prior.status,
    summary: isAiPmJudgmentFix6V1Active() ? structured : rendered,
    solutionLayers: layers,
    statusReason: 'CEO 답변 — 해결 방법 구조화 판단 갱신',
  };

  if (isAiPmJudgmentFix6V1Active()) {
    let withEvidence = applyEvidenceToDimension(merged, {
      conclusion: rendered,
      summary: structured,
      records: [
        {
          span: incoming,
          meaning: incoming,
          role: layerKey === 'approach' ? 'primary' : 'supporting',
          sourceTurnIndex,
          layerKey,
        },
      ],
      sourceTurnIndex,
    });
    withEvidence = upsertLayerEvidence(withEvidence, layerKey, incoming);
    return withEvidence;
  }

  return merged;
}

/** Detect raw append pattern (multiple unrelated sentences joined with ·). */
export function isRawSolutionAppend(summary: string): boolean {
  const parts = summary.split(/\s*·\s*/).filter((p) => p.trim().length >= 8);
  return parts.length >= 3;
}
