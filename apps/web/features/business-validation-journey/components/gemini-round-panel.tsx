'use client';

import { useEffect, useState } from 'react';

import { Button, Textarea } from '@repo/ui';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';
import type { GeminiRoundRecord } from '../lib/gemini-round-store';

type LoadResponse = {
  liveCall?: string;
  error?: string;
  records?: GeminiRoundRecord[];
  record?: GeminiRoundRecord | null;
  duplicate?: boolean;
};

export function GeminiRoundPanel({
  business,
  customer,
  problem,
}: {
  business: string;
  customer: string;
  problem: string;
}) {
  const [records, setRecords] = useState<GeminiRoundRecord[]>([]);
  const [feedback, setFeedback] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords() {
    const response = await fetch('/api/gemini-rounds');
    const body = (await response.json()) as LoadResponse;
    if (response.status === 401) {
      setMessage('로그인이 필요합니다. 응답 원문은 없습니다.');
      setRecords([]);
      return;
    }
    setRecords(body.records ?? []);
  }

  async function send(round: 1 | 2, parent: GeminiRoundRecord | null) {
    if (pending) return;
    setPending(true);
    setMessage('');
    const executionId = `gemini-r${round}-${crypto.randomUUID()}`;
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.geminiRoundSubmitted, {
      screen: '/business-validation',
      status: 'not_run',
      provider: 'google',
    });
    try {
      const response = await fetch('/api/gemini-rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          executionId,
          round,
          business,
          customer,
          problem,
          feedback: round === 2 ? feedback : undefined,
          parentExecutionId: parent?.executionId,
        }),
      });
      const body = (await response.json()) as LoadResponse;
      if (response.status === 401) {
        setMessage('로그인이 필요합니다. 응답 원문은 없습니다.');
        return;
      }
      if (!response.ok || !body.record) {
        setMessage(body.error === 'feedback_required' ? '피드백을 입력한 뒤 2차를 보냅니다.' : '질의를 저장하지 못했습니다. 원문은 없습니다.');
        return;
      }
      setRecords((current) => upsert(current, body.record as GeminiRoundRecord));
      setMessage(screenLine(body.record));
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.geminiRoundResultViewed, {
        screen: '/business-validation',
        status: body.record.status,
        provider: 'google',
        category: body.record.evidence,
      });
    } catch {
      setMessage('요청이 끝나기 전에 실패했습니다. 원문은 없습니다.');
    } finally {
      setPending(false);
    }
  }

  const first = [...records].reverse().find((record) => record.round === 1 && record.status === 'succeeded');

  return (
    <section className="mt-8 space-y-3 rounded-xl border border-border p-4" data-testid="gemini-round-panel">
      <h2 className="text-lg font-medium">Gemini 질의와 응답</h2>
      <p className="text-sm text-muted-foreground">
        서버가 공식 Gemini API로 질의를 보내고 원문을 이 화면에 다시 엽니다. 검색 출처는 이 호출에 없습니다.
      </p>
      <Button
        type="button"
        data-testid="gemini-round-1"
        disabled={pending || !business.trim()}
        onClick={() => void send(1, null)}
      >
        1차 질의 보내기
      </Button>
      {message ? (
        <p className="text-sm" data-testid="gemini-round-message" role="status">
          {message}
        </p>
      ) : null}
      <ul className="space-y-3 text-sm" data-testid="gemini-round-records">
        {records.map((record) => (
          <li key={record.executionId} data-testid={`gemini-round-${record.executionId}`}>
            <p>
              {record.round}차 · {screenLine(record)} · {record.finishedAt}
            </p>
            <p>모델: {record.model ?? '없음'}</p>
            <p data-testid={`gemini-source-${record.executionId}`}>출처 URL: 없음</p>
            <p data-testid={`gemini-content-${record.executionId}`}>{record.content ?? '원문 없음'}</p>
          </li>
        ))}
      </ul>
      {first ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send(2, first);
          }}
        >
          <label className="block text-sm" htmlFor="gemini-feedback">
            1차 원문에 대한 피드백
            <Textarea
              id="gemini-feedback"
              data-testid="gemini-feedback"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
            />
          </label>
          <Button type="submit" variant="outline" data-testid="gemini-round-2" disabled={pending || !feedback.trim()}>
            2차 질의 보내기
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="gemini-second-locked">
          1차 원문이 저장되기 전에는 2차 질의를 보내지 않습니다.
        </p>
      )}
    </section>
  );
}

function upsert(records: GeminiRoundRecord[], next: GeminiRoundRecord): GeminiRoundRecord[] {
  const without = records.filter((record) => record.executionId !== next.executionId);
  return [...without, next].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
}

function screenLine(record: GeminiRoundRecord): string {
  if (record.evidence === 'not_run' || record.status === 'not_run') return '실호출 NOT RUN. 원문 없음.';
  if (record.status === 'failed') return '실패. 원문 없음.';
  if (record.status === 'result_missing') return '응답 본문 없음.';
  if (record.evidence === 'live_network') return 'Gemini API 실응답';
  return '주입된 HTTP 응답. 실호출이 아니다.';
}
