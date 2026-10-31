'use client';

import { useEffect, useState } from 'react';

import { Button, Textarea } from '@repo/ui';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';
import {
  acceptFreeGeminiWebPaste,
  buildFreeGeminiFollowUp,
  buildFreeGeminiPrompt,
  emptyFreeGeminiWebLog,
  loadFreeGeminiWebLog,
  saveFreeGeminiWebLog,
  type FreeGeminiWebLog,
  type FreeGeminiWebRound,
} from '../lib/free-gemini-web';

export function FreeGeminiWebPanel({
  business,
  customer,
  problem,
}: {
  business: string;
  customer: string;
  problem: string;
}) {
  const [log, setLog] = useState<FreeGeminiWebLog>(emptyFreeGeminiWebLog());
  const [original, setOriginal] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [secondOriginal, setSecondOriginal] = useState('');
  const [secondSourceText, setSecondSourceText] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLog(loadFreeGeminiWebLog(window.sessionStorage));
  }, []);

  const prompt = business.trim()
    ? buildFreeGeminiPrompt({ business, customer, problem })
    : '';
  const first = [...log.rounds].reverse().find((round) => round.round === 1);
  const second = first
    ? log.rounds.find((round) => round.round === 2 && round.parentExecutionId === first.executionId)
    : undefined;
  const followUp = first && feedback.trim() ? buildFreeGeminiFollowUp({ first, feedback }) : '';

  function keep(round: 1 | 2) {
    const result = acceptFreeGeminiWebPaste(log, {
      executionId: `free-web-r${round}-${crypto.randomUUID()}`,
      round,
      business,
      customer,
      problem,
      content: round === 1 ? original : secondOriginal,
      sourceUrlText: round === 1 ? sourceText : secondSourceText,
      feedback: round === 2 ? feedback : undefined,
      parentExecutionId: round === 2 ? first?.executionId : null,
      now: new Date().toISOString(),
    });
    setMessage(result.reason);
    if (!result.accepted || !result.record) return;
    setLog(result.log);
    saveFreeGeminiWebLog(window.sessionStorage, result.log);
    if (round === 1) {
      setOriginal('');
      setSourceText('');
    } else {
      setSecondOriginal('');
      setSecondSourceText('');
    }
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.freeGeminiWebPasteKept, {
      screen: '/business-validation',
      status: 'not_run',
      provider: 'gemini-web-user',
      category: result.record.sourceStatus,
    });
  }

  return (
    <section className="mt-8 space-y-3 rounded-xl border border-border p-4" data-testid="free-gemini-web-panel">
      <h2 className="text-lg font-medium">무료 Gemini 웹에 직접 질의</h2>
      <p className="text-sm text-muted-foreground">
        사람이 무료 Gemini 웹에 아래 문장을 직접 붙여 넣는다. ALABOM은 그 페이지를 열거나 읽지 않는다. 응답 원문과 출처 URL을 여기에 붙여 넣으면 저장하고 다시 연다.
      </p>
      <p className="text-sm" data-testid="free-gemini-web-status">
        Gemini 웹 자동 회수 NOT RUN. 저장된 문장은 붙여 넣은 원문이다.
      </p>
      {prompt ? (
        <Textarea readOnly value={prompt} data-testid="free-gemini-prompt" rows={8} />
      ) : (
        <p className="text-sm" data-testid="free-gemini-prompt-missing">
          사업 입력이 있어야 1차 질의를 만든다.
        </p>
      )}
      <label className="block text-sm" htmlFor="free-gemini-original">
        1차 응답 원문
        <Textarea
          id="free-gemini-original"
          data-testid="free-gemini-original"
          value={original}
          rows={5}
          onChange={(event) => setOriginal(event.target.value)}
        />
      </label>
      <label className="block text-sm" htmlFor="free-gemini-sources">
        출처 URL. 한 줄에 하나. 없으면 비운다.
        <Textarea
          id="free-gemini-sources"
          data-testid="free-gemini-sources"
          value={sourceText}
          rows={3}
          onChange={(event) => setSourceText(event.target.value)}
        />
      </label>
      <Button type="button" data-testid="free-gemini-save-1" disabled={!prompt} onClick={() => keep(1)}>
        1차 원문 저장
      </Button>
      {message ? (
        <p className="text-sm" data-testid="free-gemini-message" role="status">
          {message}
        </p>
      ) : null}
      <ul className="space-y-3 text-sm" data-testid="free-gemini-records">
        {log.rounds.map((round) => (
          <li key={round.executionId} data-testid={`free-gemini-record-${round.executionId}`}>
            <RoundView round={round} />
          </li>
        ))}
      </ul>
      {first ? (
        <div className="space-y-3" data-testid="free-gemini-follow-up">
          <label className="block text-sm" htmlFor="free-gemini-feedback">
            1차 원문에 대한 피드백
            <Textarea
              id="free-gemini-feedback"
              data-testid="free-gemini-feedback"
              value={feedback}
              rows={3}
              onChange={(event) => setFeedback(event.target.value)}
            />
          </label>
          {followUp ? (
            <Textarea readOnly value={followUp} data-testid="free-gemini-prompt-2" rows={8} />
          ) : (
            <p className="text-sm text-muted-foreground">피드백이 있어야 2차 질의를 만든다.</p>
          )}
          <label className="block text-sm" htmlFor="free-gemini-original-2">
            2차 응답 원문
            <Textarea
              id="free-gemini-original-2"
              data-testid="free-gemini-original-2"
              value={secondOriginal}
              rows={5}
              onChange={(event) => setSecondOriginal(event.target.value)}
            />
          </label>
          <label className="block text-sm" htmlFor="free-gemini-sources-2">
            2차 출처 URL
            <Textarea
              id="free-gemini-sources-2"
              data-testid="free-gemini-sources-2"
              value={secondSourceText}
              rows={3}
              onChange={(event) => setSecondSourceText(event.target.value)}
            />
          </label>
          <Button type="button" variant="outline" data-testid="free-gemini-save-2" disabled={!followUp} onClick={() => keep(2)}>
            2차 원문 저장
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="free-gemini-second-locked">
          1차 원문이 저장되기 전에는 2차 질의를 만들지 않는다.
        </p>
      )}
      {first && second ? (
        <div className="space-y-2 text-sm" data-testid="free-gemini-compare">
          <p>1차와 2차를 나란히 연다. 둘 다 붙여 넣은 문장이고, Gemini 웹 회수는 NOT RUN이다.</p>
          <p data-testid="free-gemini-compare-1">{first.content}</p>
          <p data-testid="free-gemini-compare-2">{second.content}</p>
        </div>
      ) : null}
    </section>
  );
}

function RoundView({ round }: { round: FreeGeminiWebRound }) {
  return (
    <>
      <p>
        {round.round}차 · {round.retrievedAt} · 붙여 넣은 원문 · Gemini 웹 회수 NOT RUN
      </p>
      <p data-testid={`free-gemini-content-${round.executionId}`}>{round.content}</p>
      <p data-testid={`free-gemini-source-${round.executionId}`}>
        {round.sourceStatus === 'user_supplied'
          ? `사용자가 붙여 넣은 URL: ${round.sourceUrls.join(', ')}. ALABOM이 그 페이지를 열지 않았다.`
          : '출처 URL 없음'}
      </p>
    </>
  );
}
