import type { DecisionRecord } from '@repo/types/domain/strategic-intelligence';

import {
  applyFounderAnswer,
  bindLiteralFact,
  defineCriterion,
  resolveConflict,
  selectNextAction,
  type JudgmentLedger,
} from './si-judgment-contract';
import {
  presentWorkspaceJudgment,
  type WorkspaceJudgmentView,
} from './present-workspace-judgment';

export type ClassifiedFounderEvent =
  | { type: 'affirm_customer'; proposition: string }
  | { type: 'replace_customer'; nextStatement: string }
  | { type: 'affirm_problem_next'; proposition: string }
  | { type: 'affirm_problem'; proposition: string }
  | { type: 'unknown'; targetHypothesisId: string }
  | { type: 'payment_claim'; proposition: string }
  | { type: 'absence_claim'; proposition: string }
  | { type: 'literal_record'; recordText: string }
  | { type: 'resolve_conflict'; hypothesisId: string; evidenceId: string; reason: string }
  | {
      type: 'define_criterion';
      hypothesisId: string;
      measure: string;
      passIf: string;
      failIf: string;
      requiredLiteralScopes: string[];
    }
  | { type: 'refused' };

const UNKNOWN_PATTERN = /^(?:모르|모르겠|잘\s*모르|아직\s*모르|unknown)\b/i;
const CONFIRM_PATTERN = /^(?:맞습니다|맞아요|확인합니다|확인\s*[:：]|네[, ]*맞)/;
const ABSENCE_PATTERN = /증거는\s*없|결제·사용\s*증거|아직\s*실제\s*결제/;
const AMOUNT_PATTERN = /\d[\d,]*\s*(?:만\s*)?원/;
const PAYMENT_PATTERN = /결제|돈을\s*내|지불/;

function refused(): ClassifiedFounderEvent {
  return { type: 'refused' };
}

function parseCriterion(text: string): ClassifiedFounderEvent | null {
  const hasPass = /(?:통과|passIf)\s*[:：]/.test(text);
  const hasFail = /(?:실패|failIf)\s*[:：]/.test(text);
  if (!hasPass && !hasFail) return null;
  const passIf = text.match(/(?:통과|passIf)\s*[:：]\s*([^\n]+)/i)?.[1]?.trim() ?? '';
  const failIf = text.match(/(?:실패|failIf)\s*[:：]\s*([^\n]+)/i)?.[1]?.trim() ?? '';
  if (!passIf || !failIf) return refused();
  const measure = text.match(/(?:기준|measure)\s*[:：]\s*([^\n]+)/i)?.[1]?.trim() || '기준';
  return {
    type: 'define_criterion',
    hypothesisId: 'h-business-model',
    measure,
    passIf,
    failIf,
    requiredLiteralScopes: [],
  };
}

function parseResolve(text: string, ledger: JudgmentLedger, decision: DecisionRecord): ClassifiedFounderEvent {
  const conflict = ledger.conflicts.find((item) => item.hypothesisId === decision.hypothesisId && !item.resolved);
  if (!conflict) return refused();
  const named = [conflict.leftId, conflict.rightId].find((id) => text.includes(id));
  let evidenceId = named ?? '';
  let reason = '';
  if (!evidenceId && /^(?:이전|옛|기존)\s*[:：]/.test(text)) {
    evidenceId = conflict.leftId;
    reason = text.replace(/^(?:이전|옛|기존)\s*[:：]\s*/, '').trim();
  } else if (!evidenceId && /^(?:새|신규|문자)\s*[:：]/.test(text)) {
    evidenceId = conflict.rightId;
    reason = text.replace(/^(?:새|신규|문자)\s*[:：]\s*/, '').trim();
  } else if (evidenceId) {
    reason = text.replace(evidenceId, '').replace(/^[\s:：,.-]+|[\s:：,.-]+$/g, '').trim();
  }
  if (!evidenceId || !reason) return refused();
  return { type: 'resolve_conflict', hypothesisId: decision.hypothesisId, evidenceId, reason };
}

function contentEvent(text: string): ClassifiedFounderEvent | null {
  const absence = ABSENCE_PATTERN.test(text);
  const amount = AMOUNT_PATTERN.test(text);
  const payment = PAYMENT_PATTERN.test(text);
  if (absence && amount) return refused();
  if (absence) return { type: 'absence_claim', proposition: text };
  if (amount) return { type: 'literal_record', recordText: text };
  if (payment) return { type: 'payment_claim', proposition: text };
  return null;
}

export function classifyFounderText(
  text: string,
  ledger: JudgmentLedger,
  decision: DecisionRecord,
): ClassifiedFounderEvent {
  const trimmed = text.trim();
  if (!trimmed) return refused();
  const criterion = parseCriterion(trimmed);
  const unknown = UNKNOWN_PATTERN.test(trimmed);
  const amount = AMOUNT_PATTERN.test(trimmed);
  if (unknown && (criterion || amount || ABSENCE_PATTERN.test(trimmed))) return refused();
  if (unknown) return { type: 'unknown', targetHypothesisId: decision.hypothesisId };
  if (criterion) {
    if (amount || ABSENCE_PATTERN.test(trimmed)) return refused();
    return criterion;
  }
  if (decision.selectedId.startsWith('q-resolve-')) return parseResolve(trimmed, ledger, decision);

  const content = contentEvent(trimmed);
  if (decision.hypothesisId === 'h-customer' && decision.selectedId === 'q-customer') {
    if (/^변경\s*[:：]/.test(trimmed)) {
      const nextStatement = trimmed.replace(/^변경\s*[:：]\s*/, '').trim();
      if (!nextStatement) return refused();
      return { type: 'replace_customer', nextStatement };
    }
    const statement = ledger.hypotheses['h-customer']?.statement?.trim() ?? '';
    if (CONFIRM_PATTERN.test(trimmed) || (statement && trimmed === statement)) {
      if (!statement && !trimmed) return refused();
      return { type: 'affirm_customer', proposition: statement || trimmed };
    }
    return content ?? refused();
  }
  if (decision.selectedId === 'q-problem-next' && decision.hypothesisId === 'h-problem-next') {
    if (content) return content;
    if (/^(?:맞습니다|맞아요)$/.test(trimmed)) {
      const statement = ledger.hypotheses['h-problem-next']?.statement?.trim() ?? '';
      if (!statement) return refused();
      return { type: 'affirm_problem_next', proposition: statement };
    }
    return { type: 'affirm_problem_next', proposition: trimmed };
  }
  if (decision.selectedId === 'q-problem' && decision.hypothesisId === 'h-problem' && !ledger.pairBroken) {
    if (content) return content;
    const statement = ledger.hypotheses['h-problem']?.statement?.trim() ?? '';
    if (!statement && trimmed) return { type: 'affirm_problem', proposition: trimmed };
    if (CONFIRM_PATTERN.test(trimmed) || (statement && trimmed === statement)) {
      if (!statement) return refused();
      return { type: 'affirm_problem', proposition: statement };
    }
    return refused();
  }
  return content ?? refused();
}

export function applyClassifiedFounderEvent(
  ledger: JudgmentLedger,
  decision: DecisionRecord,
  event: ClassifiedFounderEvent,
): { ledger: JudgmentLedger; decision: DecisionRecord; applied: boolean } {
  if (event.type === 'refused') return { ledger, decision, applied: false };
  try {
    let next = ledger;
    if (event.type === 'affirm_customer') {
      next = applyFounderAnswer(ledger, decision, {
        kind: 'affirm',
        targetHypothesisId: 'h-customer',
        proposition: event.proposition,
      }).ledger;
    } else if (event.type === 'replace_customer') {
      if (!event.nextStatement.trim()) return { ledger, decision, applied: false };
      next = applyFounderAnswer(ledger, decision, {
        kind: 'replace',
        targetHypothesisId: 'h-customer',
        nextStatement: event.nextStatement,
        proposition: event.nextStatement,
      }).ledger;
    } else if (event.type === 'affirm_problem_next') {
      if (!event.proposition.trim()) return { ledger, decision, applied: false };
      next = applyFounderAnswer(ledger, decision, {
        kind: 'affirm',
        targetHypothesisId: 'h-problem-next',
        proposition: event.proposition,
      }).ledger;
    } else if (event.type === 'affirm_problem') {
      if (!event.proposition.trim()) return { ledger, decision, applied: false };
      next = applyFounderAnswer(ledger, decision, {
        kind: 'affirm',
        targetHypothesisId: 'h-problem',
        proposition: event.proposition,
      }).ledger;
    } else if (event.type === 'unknown') {
      next = applyFounderAnswer(ledger, decision, {
        kind: 'unknown',
        targetHypothesisId: decision.hypothesisId,
      }).ledger;
    } else if (event.type === 'payment_claim') {
      if (!event.proposition.trim()) return { ledger, decision, applied: false };
      next = applyFounderAnswer(ledger, decision, {
        kind: 'payment_claim',
        proposition: event.proposition,
        targetHypothesisId: 'h-business-model',
      }).ledger;
    } else if (event.type === 'absence_claim') {
      if (!event.proposition.trim()) return { ledger, decision, applied: false };
      next = applyFounderAnswer(ledger, decision, {
        kind: 'absence_claim',
        proposition: event.proposition,
        targetHypothesisId: 'h-business-model',
      }).ledger;
    } else if (event.type === 'literal_record') {
      if (!event.recordText.trim()) return { ledger, decision, applied: false };
      next = bindLiteralFact(ledger, {
        hypothesisId: 'h-business-model',
        recordText: event.recordText,
        role: 'payment-literal',
      }).ledger;
    } else if (event.type === 'define_criterion') {
      if (!event.passIf.trim() || !event.failIf.trim()) return { ledger, decision, applied: false };
      next = defineCriterion(ledger, {
        hypothesisId: event.hypothesisId,
        measure: event.measure,
        passIf: event.passIf,
        failIf: event.failIf,
        requiredLiteralScopes: event.requiredLiteralScopes,
      });
    } else if (event.type === 'resolve_conflict') {
      if (!event.reason.trim() || !event.evidenceId) return { ledger, decision, applied: false };
      next = resolveConflict(ledger, {
        hypothesisId: event.hypothesisId,
        evidenceId: event.evidenceId,
        reason: event.reason,
      });
    }
    return { ledger: next, decision: selectNextAction(next), applied: true };
  } catch {
    return { ledger, decision, applied: false };
  }
}

export function commitFounderText(
  ledger: JudgmentLedger,
  decision: DecisionRecord,
  text: string,
  previousView: WorkspaceJudgmentView | null,
): { ledger: JudgmentLedger; decision: DecisionRecord; view: WorkspaceJudgmentView; applied: boolean } {
  const event = classifyFounderText(text, ledger, decision);
  const applied = applyClassifiedFounderEvent(ledger, decision, event);
  if (!applied.applied) {
    const view = previousView ?? presentWorkspaceJudgment({ ledger, decision, previous: null });
    if (!view) {
      return {
        ledger,
        decision,
        view: {
          judgmentText: '',
          nextActionText: '',
          validationPlanStatus: 'not_required',
          validationPlanText: '',
          reviewCompletion: ledger.reviewCompletion,
        },
        applied: false,
      };
    }
    return { ledger, decision, view, applied: false };
  }
  const view = presentWorkspaceJudgment({
    ledger: applied.ledger,
    decision: applied.decision,
    previous: previousView,
  });
  if (!view || applied.ledger.validationPlan.status === 'executed') {
    const kept = previousView ?? presentWorkspaceJudgment({ ledger, decision, previous: null });
    if (!kept) {
      return {
        ledger,
        decision,
        view: {
          judgmentText: '',
          nextActionText: '',
          validationPlanStatus: 'not_required',
          validationPlanText: '',
          reviewCompletion: ledger.reviewCompletion,
        },
        applied: false,
      };
    }
    return { ledger, decision, view: kept, applied: false };
  }
  return { ledger: applied.ledger, decision: applied.decision, view, applied: true };
}
