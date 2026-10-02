/**
 * L5 internal — Evidence Strength levels (not a separate L6).
 * @see VALIDATION-ENGINE-SPRINT.md
 */

export type EvidenceStrengthLevel = 1 | 2 | 3 | 4 | 5;

export const EVIDENCE_STRENGTH_LABELS: Record<EvidenceStrengthLevel, string> = {
  1: 'Opinion — “~할 것 같다”',
  2: 'Intent — stated need without behavior',
  3: 'Behavior — observable workaround',
  4: 'Validation — interviews / experiments',
  5: 'Commitment — paid pilot / LOI',
};

/** Heuristic map from utterance cues (deterministic, no LLM). */
export function inferEvidenceStrengthFromText(text: string): EvidenceStrengthLevel {
  const t = text.trim();
  if (/파일럿|유료|결제|LOI|계약/.test(t)) return 5;
  if (/인터뷰|실험|검증|10개|7개/.test(t)) return 4;
  if (/엑셀|직접|매일|사용하고|우회/.test(t)) return 3;
  if (/필요하다|원한다|관심/.test(t)) return 2;
  if (/같아요|것 같|아마|추정/.test(t)) return 1;
  return 3;
}
