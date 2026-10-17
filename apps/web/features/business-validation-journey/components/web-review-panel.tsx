'use client';

import { useState } from 'react';

import { Button, Textarea } from '@repo/ui';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';

import type { JourneyState } from '../lib/journey-types';
import { readWebReview, storeWebReview, WEB_REVIEW_PROMPT } from '../lib/web-review-comparison';

export function WebReviewPanel({
  journey,
  onJourneyChange,
}: {
  journey: JourneyState;
  onJourneyChange: (state: JourneyState) => void;
}) {
  const stored = readWebReview(journey);
  const [gptText, setGptText] = useState('');
  const [geminiText, setGeminiText] = useState('');
  const [provenance, setProvenance] = useState<'test_fixture' | 'user_declared'>('user_declared');
  const [message, setMessage] = useState('');
  const comparison = stored.comparison;

  function onStore(slot: 'gpt' | 'gemini', text: string) {
    const result = storeWebReview(journey, {
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

  return (
    <section className="space-y-4 rounded-xl border border-border p-4" data-testid="web-review-panel">
      <h2 className="text-sm font-medium">GPT 웹과 Gemini 웹 원문 비교</h2>
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
            {stored.gpt ? `보관됨 ${stored.gpt.receivedAt}. 사실 아님. ${stored.gpt.text}` : '보관한 GPT 원문 없음'}
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
            {stored.gemini ? `보관됨 ${stored.gemini.receivedAt}. 사실 아님. ${stored.gemini.text}` : '보관한 Gemini 원문 없음'}
          </p>
        </form>
      </div>
      {message ? (
        <p className="text-sm" data-testid="web-review-message" role="status">
          {message}
        </p>
      ) : null}
      <div className="space-y-2 text-sm" data-testid="web-review-comparison">
        <p data-testid="web-review-verified">검증된 사실 아님. verifiedFact {comparison.verifiedFact ? 'true' : 'false'}.</p>
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
        <p data-testid="web-review-next">다음 검증 행동: {comparison.nextAction}</p>
      </div>
    </section>
  );
}
