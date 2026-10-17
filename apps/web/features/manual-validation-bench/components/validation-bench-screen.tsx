'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, Input, Textarea } from '@repo/ui';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';

import {
  BENCH_SESSION_KEY,
  nextRoundPrompt,
  openNextRound,
  openRound,
  presence,
  progressLabel,
  ruleSynthesisCopy,
  setBusiness,
  setFeedback,
  setGemini,
  setGpt,
  setManualSynthesis,
  synthesisFor,
  toMarkdown,
  type BenchRound,
  type ValidationBench,
} from '../lib/validation-bench';
import { loadBench, saveBench } from '../lib/validation-bench-session';

const SESSION_WRITTEN =
  '이 브라우저 탭의 세션에 기록했다. 서버 저장이 아니고, 탭을 닫으면 사라진다. 새로고침은 같은 탭에서 남는다.';
const SESSION_FAILED = '세션 기록에 실패했다. 저장 완료가 아니다.';
const SESSION_UNWRITTEN = '아직 이 탭 세션에 쓰지 않았다. 서버 저장이 아니다.';
const SESSION_REREAD = '이 탭 세션에서 다시 읽었다. 서버 저장이 아니다.';

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the selection copy used when the clipboard API is blocked.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function Stamp({ label, at }: { label: string; at: string | null }) {
  return (
    <p className="text-sm text-muted-foreground">
      {label}: {at ?? '미입력'}
    </p>
  );
}

function SealedRound({ round }: { round: BenchRound }) {
  const synthesis = synthesisFor(round);
  return (
    <article className="space-y-2 rounded-xl border border-border p-4" data-testid={`bench-sealed-${round.roundNumber}`}>
      <h3 className="text-sm font-medium">
        라운드 {round.roundNumber} 보존. {progressLabel(round)}
      </h3>
      <p className="text-sm">사업명 ({presence(round.businessName)}): {round.businessName || '미입력'}</p>
      <p className="whitespace-pre-wrap text-sm">사업계획 ({presence(round.businessPlan)}): {round.businessPlan || '미입력'}</p>
      <p className="text-sm">GPT ({presence(round.gptText)}) · {round.gptEnteredAt ?? '미입력'}</p>
      <pre className="whitespace-pre-wrap text-sm" data-testid={`bench-sealed-${round.roundNumber}-gpt`}>
        {round.gptText || '미입력'}
      </pre>
      <p className="text-sm">Gemini ({presence(round.geminiText)}) · {round.geminiEnteredAt ?? '미입력'}</p>
      <pre className="whitespace-pre-wrap text-sm" data-testid={`bench-sealed-${round.roundNumber}-gemini`}>
        {round.geminiText || '미입력'}
      </pre>
      <p className="text-sm">규칙 취합 ({synthesis.status}) · {synthesis.source}</p>
      <pre className="whitespace-pre-wrap text-sm">{ruleSynthesisCopy(round)}</pre>
      <p className="text-sm">수동 종합 ({presence(round.manualSynthesis)}) · 사람이 입력</p>
      <pre className="whitespace-pre-wrap text-sm">{round.manualSynthesis || '미입력'}</pre>
      <p className="text-sm">CEO 피드백 ({presence(round.feedback)}) · 사람이 입력 · {round.feedbackAt ?? '미입력'}</p>
      <pre className="whitespace-pre-wrap text-sm" data-testid={`bench-sealed-${round.roundNumber}-feedback`}>
        {round.feedback || '미입력'}
      </pre>
    </article>
  );
}

export function ValidationBenchScreen() {
  const [bench, setBench] = useState<ValidationBench | null>(null);
  const [sessionNote, setSessionNote] = useState(SESSION_UNWRITTEN);
  const [actionNote, setActionNote] = useState('');
  const [copyNote, setCopyNote] = useState('');
  const reported = useRef({ gpt: false, gemini: false });

  useEffect(() => {
    const loaded = loadBench();
    setBench(loaded);
    const existing = window.sessionStorage.getItem(BENCH_SESSION_KEY);
    setSessionNote(existing ? SESSION_REREAD : SESSION_UNWRITTEN);
    const round = openRound(loaded);
    reported.current = { gpt: Boolean(round.gptText.trim()), gemini: Boolean(round.geminiText.trim()) };
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationJourneyStarted, {
      screen: '/validation-bench',
      status: 'research_not_run',
      category: 'manual_bench',
    });
  }, []);

  function commit(next: ValidationBench) {
    setBench(next);
    const saved = saveBench(next);
    setSessionNote(saved.ok ? SESSION_WRITTEN : SESSION_FAILED);
  }

  function reportPaste(slot: 'gpt' | 'gemini', text: string) {
    if (!text.trim() || reported.current[slot]) return;
    reported.current[slot] = true;
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationJourneyHandoffKept, {
      screen: '/validation-bench',
      status: 'research_not_run',
      question_id: slot,
      category: 'manual_paste',
    });
  }

  async function onCopy(label: string, text: string) {
    const ok = await writeClipboard(text);
    setCopyNote(ok ? `${label} 복사함` : `${label} 복사 실패`);
  }

  if (!bench) {
    return <p className="p-4 text-sm">이 탭의 검증 기록을 읽는 중.</p>;
  }

  const current = openRound(bench);
  const synthesis = synthesisFor(current);
  const sealed = bench.rounds.filter((round) => round.sealed);
  const editable = !current.sealed;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <header className="space-y-2">
        <h1 className="text-xl font-medium">CEO 수동 검증</h1>
        <p className="text-sm">
          이 화면은 GPT 웹과 Gemini 웹의 실제 응답을 붙여 넣고 복사하는 임시 도구다. ALABOM은 모델을 호출하지 않는다. 붙여 넣은 원문, 사람이 적은 피드백, ALABOM 규칙 취합을 서로 바꾸지 않는다.
        </p>
        <p className="text-sm" data-testid="bench-verification">
          검증 완료 아님. 원문이 비어 있으면 미입력이고, 취합이나 다음 라운드를 실행하지 않았으면 미실행이다.
        </p>
        <p className="text-sm" data-testid="bench-session-note" role="status">
          {sessionNote}
        </p>
        <p className="text-sm text-muted-foreground">
          이 화면은 로그인 뒤에 열린다. 입력한 사업계획과 원문은 이 브라우저 탭의 세션에만 있고, 계정 서버 기록으로 저장하지 않는다. 다른 브라우저에는 이 탭의 기록이 없다.
        </p>
      </header>

      <section className="space-y-2" data-testid="bench-round-compare">
        <h2 className="text-sm font-medium">라운드 구분</h2>
        <ul className="space-y-1 text-sm">
          {bench.rounds.map((round) => {
            const roundSynthesis = synthesisFor(round);
            return (
              <li key={round.roundNumber} data-testid={`bench-compare-${round.roundNumber}`}>
                라운드 {round.roundNumber} · {round.sealed ? '보존' : '진행 중'} · 사업계획 {presence(round.businessPlan)} · GPT {presence(round.gptText)} · Gemini {presence(round.geminiText)} · 규칙 취합 {roundSynthesis.status} · 피드백 {presence(round.feedback)}
              </li>
            );
          })}
        </ul>
      </section>

      {sealed.map((round) => (
        <SealedRound key={round.roundNumber} round={round} />
      ))}

      <section className="space-y-3 rounded-xl border border-border p-4" data-testid="bench-open-round">
        <h2 className="text-sm font-medium">라운드 {current.roundNumber}</h2>
        <p className="text-sm" data-testid="bench-progress">
          {progressLabel(current)}
        </p>
        <label className="block space-y-1 text-sm" htmlFor="bench-business-name">
          사업명 ({presence(current.businessName)})
          <Input
            id="bench-business-name"
            data-testid="bench-business-name"
            value={current.businessName}
            disabled={!editable}
            onChange={(event) =>
              commit(setBusiness(bench, { businessName: event.target.value, businessPlan: current.businessPlan }))
            }
          />
        </label>
        <label className="block space-y-1 text-sm" htmlFor="bench-business-plan">
          사업계획 원문 ({presence(current.businessPlan)})
          <Textarea
            id="bench-business-plan"
            data-testid="bench-business-plan"
            rows={8}
            value={current.businessPlan}
            disabled={!editable}
            placeholder="사업계획 원문"
            onChange={(event) =>
              commit(setBusiness(bench, { businessName: current.businessName, businessPlan: event.target.value }))
            }
          />
        </label>
        <Button type="button" variant="outline" data-testid="bench-copy-plan" onClick={() => onCopy('사업계획', current.businessPlan)}>
          사업계획 복사
        </Button>
        {current.roundNumber > 1 ? (
          <div className="space-y-1">
            <p className="text-sm">이 라운드 입력. ALABOM이 이전 사업계획과 CEO 피드백으로 구성했다. 모델 원문이 아니다.</p>
            <Textarea readOnly rows={6} value={current.inputPrompt} data-testid="bench-round-input" />
            <Button type="button" variant="outline" data-testid="bench-copy-round-input" onClick={() => onCopy('라운드 입력', current.inputPrompt)}>
              이 라운드 입력 복사
            </Button>
          </div>
        ) : null}

        <div className="space-y-1">
          <h3 className="text-sm font-medium">GPT 웹 원문 ({presence(current.gptText)})</h3>
          <p className="text-sm text-muted-foreground">사람이 GPT 웹에서 복사해 붙여 넣은 원문이다. ALABOM이 만들지 않는다.</p>
          <Textarea
            data-testid="bench-gpt"
            rows={8}
            value={current.gptText}
            disabled={!editable}
            placeholder="GPT 웹 응답 원문"
            onChange={(event) => {
              reportPaste('gpt', event.target.value);
              commit(setGpt(bench, event.target.value, new Date().toISOString()));
            }}
          />
          <Stamp label="GPT 입력 시각" at={current.gptEnteredAt} />
          <Button type="button" variant="outline" data-testid="bench-copy-gpt" onClick={() => onCopy('GPT 원문', current.gptText)}>
            GPT 원문 복사
          </Button>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium">Gemini 웹 원문 ({presence(current.geminiText)})</h3>
          <p className="text-sm text-muted-foreground">같은 사업계획과 이 라운드 GPT 원문을 Gemini 웹에 넣어 받은 응답이다. ALABOM이 만들지 않는다.</p>
          <Textarea
            data-testid="bench-gemini"
            rows={8}
            value={current.geminiText}
            disabled={!editable}
            placeholder="Gemini 웹 응답 원문"
            onChange={(event) => {
              reportPaste('gemini', event.target.value);
              commit(setGemini(bench, event.target.value, new Date().toISOString()));
            }}
          />
          <Stamp label="Gemini 입력 시각" at={current.geminiEnteredAt} />
          <Button type="button" variant="outline" data-testid="bench-copy-gemini" onClick={() => onCopy('Gemini 원문', current.geminiText)}>
            Gemini 원문 복사
          </Button>
        </div>

        <div className="space-y-1" data-testid="bench-rule">
          <h3 className="text-sm font-medium">규칙 취합 ({synthesis.status})</h3>
          <p className="text-sm">출처: {synthesis.source}. {synthesis.reason}</p>
          <p className="text-sm">이 규칙은 고정된 S1–S6, A1–A2 문구만 본다. 그 문구가 없으면 사업 전체를 판단한 것이 아니다.</p>
          {synthesis.comparison ? (
            <div className="space-y-1 text-sm">
              <p data-testid="bench-fact-status">사실 상태: {synthesis.comparison.factStatus}. verifiedFact는 false다. 검증 완료가 아니다.</p>
              <p>합의: {synthesis.comparison.agreement.join(' / ') || '없음'}</p>
              <p>충돌: {synthesis.comparison.conflict.join(' / ') || '없음'}</p>
              <p>근거 부족: {synthesis.comparison.insufficient.join(' / ')}</p>
              <p>다음 행동: {synthesis.comparison.nextAction}</p>
            </div>
          ) : (
            <p className="text-sm" data-testid="bench-rule-empty">미실행</p>
          )}
          <Button type="button" variant="outline" data-testid="bench-copy-rule" onClick={() => onCopy('규칙 취합', ruleSynthesisCopy(current))}>
            규칙 취합 복사
          </Button>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium">수동 종합 ({presence(current.manualSynthesis)}) · 사람이 입력</h3>
          <p className="text-sm text-muted-foreground">규칙 취합과 다른 칸이다. 비어 있으면 미입력이고, 규칙 결과로 채우지 않는다.</p>
          <Textarea
            data-testid="bench-manual"
            rows={6}
            value={current.manualSynthesis}
            disabled={!editable}
            placeholder="사람이 적은 종합"
            onChange={(event) => commit(setManualSynthesis(bench, event.target.value, new Date().toISOString()))}
          />
          <Stamp label="수동 종합 입력 시각" at={current.manualSynthesisAt} />
          <Button type="button" variant="outline" data-testid="bench-copy-manual" onClick={() => onCopy('수동 종합', current.manualSynthesis)}>
            수동 종합 복사
          </Button>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium">CEO 피드백 ({presence(current.feedback)}) · 사람이 입력</h3>
          <Textarea
            data-testid="bench-feedback"
            rows={5}
            value={current.feedback}
            disabled={!editable}
            placeholder="CEO 피드백"
            onChange={(event) => commit(setFeedback(bench, event.target.value, new Date().toISOString()))}
          />
          <Stamp label="피드백 입력 시각" at={current.feedbackAt} />
          <Button type="button" variant="outline" data-testid="bench-copy-feedback" onClick={() => onCopy('CEO 피드백', current.feedback)}>
            피드백 복사
          </Button>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-medium">다음 라운드 입력 미리보기 · ALABOM 구성 · 모델 원문 아님</h3>
          <Textarea readOnly rows={8} value={nextRoundPrompt(current)} data-testid="bench-next-prompt" />
          <Button
            type="button"
            variant="outline"
            data-testid="bench-copy-next-prompt"
            onClick={() => onCopy('다음 라운드 입력', nextRoundPrompt(current))}
          >
            다음 라운드 입력 복사
          </Button>
          <Button
            type="button"
            data-testid="bench-open-next"
            onClick={() => {
              const result = openNextRound(bench);
              setActionNote(result.reason);
              if (!result.accepted) return;
              commit(result.bench);
              void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.validationJourneyAnswered, {
                screen: '/validation-bench',
                status: 'research_not_run',
                question_id: `r${current.roundNumber}`,
                category: 'manual_next_round',
              });
            }}
          >
            다음 라운드 열기
          </Button>
          <p className="text-sm">다음 라운드의 GPT 재조회는 이 버튼을 눌러도 미실행이다. 원문을 붙여 넣기 전까지 미입력이다.</p>
        </div>
      </section>

      {actionNote ? (
        <p className="text-sm" data-testid="bench-action-note" role="status">
          {actionNote}
        </p>
      ) : null}
      {copyNote ? (
        <p className="text-sm" data-testid="bench-copy-note" role="status">
          {copyNote}
        </p>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" data-testid="bench-copy-markdown" onClick={() => onCopy('Markdown 기록', toMarkdown(bench))}>
          전체 기록 Markdown 복사
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="bench-copy-json"
          onClick={() => onCopy('JSON 기록', JSON.stringify(bench, null, 2))}
        >
          전체 기록 JSON 복사
        </Button>
      </section>
    </div>
  );
}
