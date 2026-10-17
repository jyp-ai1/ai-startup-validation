'use client';

import { useState } from 'react';

import { Button, Textarea } from '@repo/ui';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';

import type { JourneyState } from '../lib/journey-types';
import {
  holdValidationLoop,
  LOOP_PHASE_NOTE,
  openRound,
  readValidationLoop,
  storeLoopOriginal,
  submitRoundFeedback,
} from '../lib/validation-round-loop';
import { assessFounderExecution } from '../lib/verification-outcome';
import { compareWebReviews, WEB_REVIEW_PROMPT } from '../lib/web-review-comparison';

export function WebReviewPanel({
  journey,
  onJourneyChange,
}: {
  journey: JourneyState;
  onJourneyChange: (state: JourneyState) => void;
}) {
  const loop = readValidationLoop(journey);
  const round = openRound(loop);
  const [gptText, setGptText] = useState('');
  const [geminiText, setGeminiText] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [provenance, setProvenance] = useState<'test_fixture' | 'user_declared'>('user_declared');
  const [message, setMessage] = useState('');
  const comparison = round?.aggregation ?? compareWebReviews(round?.gptText ?? null, round?.geminiText ?? null);
  const hold = assessFounderExecution({ stage: round?.founderFeedback ? 'evidence_insufficient' : 'before_execution' });

  function onStore(slot: 'gpt' | 'gemini', text: string) {
    const result = storeLoopOriginal(journey, {
      slot,
      text,
      now: new Date().toISOString(),
      provenance,
    });
    setMessage(result.reason);
    if (!result.accepted) return;
    onJourneyChange(result.state);
    if (slot === 'gpt') setGptText('');
    else setGeminiText('');
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationJourneyHandoffKept, {
      screen: '/business-validation',
      status: 'research_not_run',
      question_id: slot,
      category: provenance,
    });
  }

  function onFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = submitRoundFeedback(journey, { text: feedbackText, now: new Date().toISOString() });
    setMessage(result.reason);
    if (!result.accepted) return;
    onJourneyChange(result.state);
    setFeedbackText('');
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationJourneyAnswered, {
      screen: '/business-validation',
      status: 'research_not_run',
      question_id: round?.roundId,
      category: 'loop_feedback',
    });
  }

  function onHold() {
    const result = holdValidationLoop(journey, new Date().toISOString());
    setMessage(result.reason);
    if (!result.accepted) return;
    onJourneyChange(result.state);
  }

  return (
    <section className="space-y-4 rounded-xl border border-border p-4" data-testid="web-review-panel">
      <h2 className="text-sm font-medium">GPT 웹과 Gemini 웹 원문 비교</h2>
      <p className="text-sm" data-testid="loop-phase">
        회차 {round?.roundId ?? 'r1'} · {round?.phase ?? 'GPT 원문 대기'}. {LOOP_PHASE_NOTE}
      </p>
      <p className="text-sm text-muted-foreground">
        ALABOM은 이 입력을 모델 API나 AI 웹 화면에 보내지 않는다. GPT 웹에서 먼저 분석하고, 그 원문과 같은 입력을 Gemini 웹에 넣어 반론을 받은 뒤, 두 원문을 각각 붙여 넣는다. 두 문장이 같아도 원장이 없으면 검증된 사실이 아니다.
      </p>
      <Textarea readOnly value={WEB_REVIEW_PROMPT} data-testid="web-review-prompt" rows={8} />
      <label className="block text-sm" htmlFor="web-review-provenance">
        문장 구분
        <select
          id="web-review-provenance"
          className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          data-testid="web-review-provenance"
          value={provenance}
          onChange={(event) => setProvenance(event.target.value as 'test_fixture' | 'user_declared')}
        >
          <option value="user_declared">사용자가 웹에서 복사한 원문이라고 표시</option>
          <option value="test_fixture">테스트 문장</option>
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <form
          className="space-y-2"
          data-testid="web-review-gpt-form"
          onSubmit={(event) => {
            event.preventDefault();
            onStore('gpt', gptText);
          }}
        >
          <h3 className="text-sm font-medium">GPT 웹 원문</h3>
          <Textarea
            value={gptText}
            data-testid="web-review-gpt-input"
            rows={6}
            placeholder="GPT 웹에서 복사한 원문"
            onChange={(event) => setGptText(event.target.value)}
          />
          <Button type="submit" variant="outline" data-testid="web-review-gpt-save">
            GPT 원문 보관
          </Button>
          <p className="whitespace-pre-wrap text-sm" data-testid="web-review-gpt-stored">
            {round?.gptText ? `보관됨 ${round.gptRecordedAt}. 사실 아님. ${round.gptText}` : '보관한 GPT 원문 없음'}
          </p>
        </form>
        <form
          className="space-y-2"
          data-testid="web-review-gemini-form"
          onSubmit={(event) => {
            event.preventDefault();
            onStore('gemini', geminiText);
          }}
        >
          <h3 className="text-sm font-medium">Gemini 웹 원문</h3>
          <Textarea
            value={geminiText}
            data-testid="web-review-gemini-input"
            rows={6}
            placeholder="Gemini 웹에서 복사한 반론 원문"
            onChange={(event) => setGeminiText(event.target.value)}
          />
          <Button type="submit" variant="outline" data-testid="web-review-gemini-save">
            Gemini 원문 보관
          </Button>
          <p className="whitespace-pre-wrap text-sm" data-testid="web-review-gemini-stored">
            {round?.geminiText ? `보관됨 ${round.geminiRecordedAt}. 사실 아님. ${round.geminiText}` : '보관한 Gemini 원문 없음'}
          </p>
        </form>
      </div>
      {message ? (
        <p className="text-sm" data-testid="web-review-message" role="status">
          {message}
        </p>
      ) : null}
      <div className="space-y-2 text-sm" data-testid="web-review-comparison">
        <p data-testid="web-review-verified">
          verifiedFact {comparison.verifiedFact ? 'true' : 'false'}. 이 값은 사실 검증이 끝났다는 표시가 아니다.
        </p>
        <p data-testid="web-review-fact-status">
          사실 상태: {comparison.factStatus}. 이 화면의 비교는 사실 상태를 미확인에서 옮기지 않는다.
        </p>
        <p data-testid="web-review-rejudge">
          재판정: {hold.decision}. {hold.reason}
        </p>
        <div>
          <h3 className="font-medium">합의</h3>
          <ul data-testid="web-review-agreement">
            {comparison.agreement.length === 0 ? <li>없음</li> : comparison.agreement.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-medium">충돌</h3>
          <ul data-testid="web-review-conflict">
            {comparison.conflict.length === 0 ? <li>없음</li> : comparison.conflict.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-medium">근거 부족</h3>
          <ul data-testid="web-review-insufficient">
            {comparison.insufficient.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div data-testid="web-review-experiment">
          <h3 className="font-medium">다음 검증 실험</h3>
          <p data-testid="web-review-experiment-scope">
            이 실험은 붙여 넣은 두 문장의 비교에서 만든다. 저장된 단일 모델 출력의 실험은 이 화면에 없다.
          </p>
          <p>가설: {comparison.nextExperiment.hypothesis}</p>
          <p>자료: {comparison.nextExperiment.material}</p>
          <p>방법: {comparison.nextExperiment.method}</p>
          <p>비용: {comparison.nextExperiment.cost}. 기간: {comparison.nextExperiment.duration}.</p>
          <p>성공: {comparison.nextExperiment.success}</p>
          <p>실패: {comparison.nextExperiment.failure}</p>
        </div>
        <p data-testid="web-review-next">다음 검증 행동: {comparison.nextAction}</p>
        <div>
          <h3 className="font-medium">미해결 질문</h3>
          <ul data-testid="loop-questions">
            {(round?.unresolvedQuestions ?? []).length === 0 ? (
              <li>없음</li>
            ) : (
              round?.unresolvedQuestions.map((item) => <li key={item}>{item}</li>)
            )}
          </ul>
        </div>
      </div>
      {round && round.roundNumber > 1 ? (
        <Textarea readOnly value={round.businessSnapshot} data-testid="loop-next-input" rows={6} />
      ) : null}
      {round?.phase === 'Founder 검토 대기' ? (
        <form className="space-y-2" data-testid="loop-feedback-form" onSubmit={onFeedback}>
          <h3 className="text-sm font-medium">Founder 피드백</h3>
          <p className="text-sm text-muted-foreground">
            이 답은 다음 회차의 GPT 입력에 들어간다. 증빙 검토가 아니므로 사실 상태를 옮기지 않는다.
          </p>
          <Textarea
            value={feedbackText}
            data-testid="loop-feedback-input"
            rows={4}
            onChange={(event) => setFeedbackText(event.target.value)}
          />
          <Button type="submit" variant="outline" data-testid="loop-feedback-save">
            피드백을 다음 회차 입력에 반영
          </Button>
        </form>
      ) : null}
      <Button type="button" variant="outline" data-testid="loop-hold" onClick={onHold}>
        이 반복을 보류
      </Button>
      <ul className="space-y-1 text-sm" data-testid="loop-rounds">
        {(loop?.rounds ?? []).map((item) => (
          <li key={item.roundId} data-testid={`loop-round-${item.roundNumber}`}>
            {item.roundId} · {item.phase} · GPT {item.gptText ? '있음' : '없음'} · Gemini {item.geminiText ? '있음' : '없음'}
          </li>
        ))}
      </ul>
    </section>
  );
}
