import { describe, expect, it } from 'vitest';

import { evaluateTurnDeterministic } from '../deterministic-evaluator';
import { highestPriorityOpenGap, isGapPriorityAligned } from '../gap-priority-evaluator';
import { applyGroundTruthAnswer, createInitialGroundTruthState } from '../ground-truth-engine';

const REVERSAL = '실제 최종 고객은 50대 남성 기업 IT 담당자입니다. 이전에 말한 고객 정의는 초기 가설이었습니다.';
const STAGE_A_CLOSED = {
  businessOneLiner: 'CLOSED',
  customerPersona: 'CLOSED',
  payer: 'CLOSED',
  problemJtbd: 'CLOSED',
};

function gtAfter(answers: Array<{ answer: string; asked: string; turn: number }>) {
  let state = createInitialGroundTruthState();
  for (const a of answers) {
    state = applyGroundTruthAnswer({
      state,
      behavior: 'contradiction',
      turn: a.turn,
      userAnswer: a.answer,
      askedGapId: a.asked,
    });
  }
  return state;
}

describe('Phase 2-A — GT persona conflict transition', () => {
  it('raises CONFLICT on the reversal and resolves it when the user restates the new definition', () => {
    const conflict = gtAfter([
      { answer: '고객은 직장인입니다.', asked: 'customerPersona', turn: 1 },
      { answer: REVERSAL, asked: 'marketChannel', turn: 4 },
    ]);
    expect(conflict.gaps.customerPersona).toBe('CONFLICT');

    const resolved = gtAfter([
      { answer: '고객은 직장인입니다.', asked: 'customerPersona', turn: 1 },
      { answer: REVERSAL, asked: 'marketChannel', turn: 4 },
      { answer: REVERSAL, asked: 'customerPersona', turn: 5 },
    ]);
    expect(resolved.gaps.customerPersona).toBe('CLOSED');
    const last = resolved.transitionLog.at(-1);
    expect(last).toMatchObject({ slot: 'customerPersona', from: 'CONFLICT', to: 'CLOSED', trigger: 'correction' });
  });

  it('a different new definition while in CONFLICT keeps the conflict', () => {
    const state = gtAfter([
      { answer: '고객은 직장인입니다.', asked: 'customerPersona', turn: 1 },
      { answer: REVERSAL, asked: 'marketChannel', turn: 4 },
      { answer: '실제 최종 고객은 대학생입니다. 이전에 말한 고객 정의는 초기 가설이었습니다.', asked: 'customerPersona', turn: 5 },
    ]);
    expect(state.gaps.customerPersona).toBe('CONFLICT');
  });

  it('a refinement turn is not a reversal', () => {
    const state = gtAfter([
      { answer: '고객은 직장인입니다.', asked: 'customerPersona', turn: 1 },
      { answer: '정정합니다. 고객은 직장인 중심이 맞고, SMB도 포함합니다.', asked: 'marketChannel', turn: 4 },
    ]);
    expect(state.gaps.customerPersona).not.toBe('CONFLICT');
  });

  it('stored state matches the last logged transition', () => {
    const state = gtAfter([
      { answer: '고객은 직장인입니다.', asked: 'customerPersona', turn: 1 },
      { answer: REVERSAL, asked: 'marketChannel', turn: 4 },
    ]);
    const last = state.transitionLog.filter((t) => t.slot === 'customerPersona').at(-1);
    expect(last?.to).toBe(state.gaps.customerPersona);
  });
});

describe('Phase 2-A — F11 evaluator follows GT', () => {
  const base = {
    userAnswer: REVERSAL,
    extractedFacts: [],
    behavior: 'contradiction',
    turn: 5,
    askedGapId: 'customerPersona',
    nextTargetGap: 'marketChannel',
  };

  it('flags a lost conflict while GT is CONFLICT', () => {
    const e = evaluateTurnDeterministic({
      ...base,
      groundTruthGap: { customerPersona: 'CONFLICT' },
      aiGapSnapshot: { ...STAGE_A_CLOSED },
    });
    expect(e.failureType).toContain('F11_CONTRADICTION_MISHANDLING');
    expect(e.failureType).toContain('STATE_DRIFT');
  });

  it('accepts the explicit resolution', () => {
    const e = evaluateTurnDeterministic({
      ...base,
      groundTruthGap: { customerPersona: 'CLOSED' },
      aiGapSnapshot: { ...STAGE_A_CLOSED },
    });
    expect(e.failureType).not.toContain('F11_CONTRADICTION_MISHANDLING');
    expect(e.failureType).not.toContain('STATE_DRIFT');
  });
});

describe('Phase 2-A — F08 evaluator uses the V3 stage SoT', () => {
  it('expects a never-asked Stage A gap before Stage B or non-required gaps', () => {
    expect(highestPriorityOpenGap({ businessOneLiner: 'CLOSED', revenueModel: 'PARTIAL' })).toBe(
      'customerPersona',
    );
  });

  it('prioritizes a CONTRADICTED gap within the unfinished stage', () => {
    expect(
      highestPriorityOpenGap({ businessOneLiner: 'CLOSED', customerPersona: 'OPEN', problemJtbd: 'CONTRADICTED' }),
    ).toBe('problemJtbd');
  });

  it('moves to Stage B order once Stage A is closed, ignoring non-required gaps', () => {
    expect(highestPriorityOpenGap({ ...STAGE_A_CLOSED, revenueModel: 'PARTIAL' })).toBe('marketChannel');
  });

  it('passes resolving a CONTRADICTED gap', () => {
    const snap = { ...STAGE_A_CLOSED, problemJtbd: 'CONTRADICTED', marketChannel: 'OPEN' };
    expect(isGapPriorityAligned('problemJtbd', snap).pass).toBe(true);
  });

  it('fails asking a CLOSED gap', () => {
    expect(isGapPriorityAligned('payer', { ...STAGE_A_CLOSED }).pass).toBe(false);
  });

  it('fails skipping to Stage B while Stage A is unfinished', () => {
    expect(isGapPriorityAligned('marketChannel', { businessOneLiner: 'CLOSED' }).pass).toBe(false);
  });

  it('fails a missing next target while gaps remain', () => {
    expect(isGapPriorityAligned(null, { businessOneLiner: 'CLOSED' }).pass).toBe(false);
  });
});
