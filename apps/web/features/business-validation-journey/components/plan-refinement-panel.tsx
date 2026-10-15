'use client';

import { useState } from 'react';

import { Button, Textarea } from '@repo/ui';

import type { JourneyState } from '../lib/journey-types';
import { recordDesignAnswer, refinePlan, type DesignStance } from '../lib/plan-refinement';

export function PlanRefinementPanel({
  journey,
  onJourneyChange,
}: {
  journey: JourneyState;
  onJourneyChange: (state: JourneyState) => void;
}) {
  const draft = refinePlan(journey);
  const [text, setText] = useState('');
  const [stance, setStance] = useState<DesignStance>('hypothesis');
  const [note, setNote] = useState('');
  if (!draft) return null;

  return (
    <section className="space-y-3 rounded-xl border border-border p-4" data-testid="refinement-dossier">
      <h2 className="text-lg font-medium">사업 초안 {draft.pass}회차</h2>
      <p className="text-sm" data-testid="refinement-label">
        {draft.label}
      </p>
      <p className="text-sm leading-relaxed" data-testid="refinement-model">
        사업모델: {draft.businessModel}
      </p>
      <p className="text-sm leading-relaxed" data-testid="refinement-customer">
        고객: {draft.customer}
      </p>
      <p className="text-sm leading-relaxed" data-testid="refinement-problem">
        문제: {draft.problem}
      </p>
      <p className="text-sm leading-relaxed" data-testid="refinement-differentiation">
        차별: {draft.differentiation}
      </p>
      <p className="text-sm leading-relaxed" data-testid="refinement-price">
        가격: {draft.price}
      </p>
      <p className="text-sm leading-relaxed" data-testid="refinement-profit">
        수익성: {draft.profitability}
      </p>
      <p className="text-sm leading-relaxed" data-testid="refinement-execution">
        실행: {draft.execution}
      </p>
      <p className="text-sm leading-relaxed" data-testid="refinement-judgment">
        판단: {draft.judgment}
      </p>
      <p className="text-sm" data-testid="refinement-changed">
        바뀐 내용: {draft.changed.length ? draft.changed.join(' ') : '아직 없다.'}
      </p>
      <p className="text-sm" data-testid="refinement-unchanged">
        유지된 내용: {draft.unchanged.join(' ')}
      </p>
      <p className="text-sm" data-testid="refinement-claims">
        문서 주장: {draft.documentClaims.join(' ')}
      </p>
      <p className="text-sm" data-testid="refinement-founder">
        대표 답변: {draft.founderStatements.length ? draft.founderStatements.join(' ') : '아직 없다.'}
      </p>
      <p className="text-sm" data-testid="refinement-inference">
        추론: {draft.inferences.join(' ')}
      </p>
      <p className="text-sm" data-testid="refinement-assumption">
        가정: {draft.assumptions.join(' ')}
      </p>
      <p className="text-sm" data-testid="refinement-external">
        외부 메모: {draft.externalNotes.join(' ')}
      </p>
      <p className="text-sm" data-testid="refinement-next">
        다음: {draft.nextStep}
      </p>
      <form
        className="space-y-2 border-t border-border pt-3"
        data-testid="design-form"
        onSubmit={(event) => {
          event.preventDefault();
          const result = recordDesignAnswer(journey, { text, stance, now: new Date().toISOString() });
          setNote(result.reason);
          if (!result.applied) return;
          onJourneyChange(result.state);
          setText('');
        }}
      >
        <label htmlFor="design-text" className="text-sm font-medium">
          대표의 테스트 답변. 실적 원장으로 세지 않는다.
        </label>
        <select
          id="design-stance"
          data-testid="design-stance"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          value={stance}
          onChange={(event) => setStance(event.target.value as DesignStance)}
        >
          <option value="hypothesis">예상·가설</option>
          <option value="unknown">아직 모름</option>
          <option value="counter">반대 의견</option>
          <option value="experience">경험</option>
          <option value="claimed_record">확인했다고 보는 기록</option>
        </select>
        <Textarea id="design-text" data-testid="design-text" value={text} onChange={(event) => setText(event.target.value)} />
        <Button type="submit" variant="outline" data-testid="submit-design">
          이 답변으로 사업 초안 다시 쓰기
        </Button>
        {note ? (
          <p className="text-sm" data-testid="design-note">
            {note}
          </p>
        ) : null}
      </form>
    </section>
  );
}
