import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createBench,
  nextRoundPrompt,
  openNextRound,
  openRound,
  parseBench,
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
} from '../validation-bench';

const NOW = '2026-10-17T00:00:00.000Z';
const PLAN = 'S3: 모회사와 상품 공급 계약 체결 (예상 연매출 10억)\nA2: 모회사 지원이 필수다.';
const GPT = '예상 연매출 10억은 계획이다. 모회사 지원이 필수다.';
const GEMINI = '10억은 받은 매출이 아니다. 모회사 지원이 필수라는 주장에 동의하지 않고 없이도 유지할 수 있다.';

describe('manual validation bench', () => {
  it('starts empty and does not mark verification complete', () => {
    const bench = createBench();
    const round = openRound(bench);
    expect(bench.permanent).toBe(false);
    expect(bench.liveModelCall).toBe(false);
    expect(bench.storage).toBe('browser-session');
    expect(presence(round.gptText)).toBe('미입력');
    expect(presence(round.geminiText)).toBe('미입력');
    expect(synthesisFor(round).status).toBe('미실행');
    expect(progressLabel(round)).toContain('검증 완료 아님');
    expect(toMarkdown(bench)).toContain('미입력');
    expect(toMarkdown(bench)).toContain('미실행');
    expect(toMarkdown(bench)).not.toContain('검증 완료로 표시');
  });

  it('keeps a cleared original as 미입력', () => {
    const bench = setGpt(setGpt(createBench(), '원문', NOW), '   ', NOW);
    const round = openRound(bench);
    expect(round.gptText).toBe('   ');
    expect(round.gptEnteredAt).toBeNull();
    expect(presence(round.gptText)).toBe('미입력');
  });

  it('does not synthesize when one original is missing', () => {
    const bench = setGpt(createBench(), GPT, NOW);
    const synthesis = synthesisFor(openRound(bench));
    expect(synthesis.status).toBe('미실행');
    expect(synthesis.comparison).toBeNull();
    expect(ruleSynthesisCopy(openRound(bench))).toBe('미실행');
    const blocked = openNextRound(setFeedback(bench, '피드백', NOW));
    expect(blocked.accepted).toBe(false);
    expect(blocked.reason).toContain('원문이 비어 있다');
    expect(blocked.bench.rounds).toHaveLength(1);
  });

  it('keeps pasted originals separate from manual synthesis and rule output', () => {
    let bench = setBusiness(createBench(), { businessName: '모회사', businessPlan: PLAN });
    bench = setGpt(bench, GPT, NOW);
    bench = setGemini(bench, GEMINI, NOW);
    bench = setManualSynthesis(bench, '사람이 적은 종합', NOW);
    const round = openRound(bench);
    const synthesis = synthesisFor(round);
    expect(round.gptText).toBe(GPT);
    expect(round.geminiText).toBe(GEMINI);
    expect(round.manualSynthesis).toBe('사람이 적은 종합');
    expect(synthesis.status).toBe('실행됨');
    expect(synthesis.source).toBe('ALABOM 규칙 취합');
    expect(synthesis.comparison?.verifiedFact).toBe(false);
    expect(synthesis.comparison?.factStatus).toBe('미확인');
    expect(synthesis.comparison?.liveModelCall).toBe(false);
    expect(ruleSynthesisCopy(round)).toContain('ALABOM 규칙 취합');
    expect(ruleSynthesisCopy(round)).not.toContain('사람이 적은 종합');
    const markdown = toMarkdown(bench);
    expect(markdown).toContain('사람이 붙여 넣은 모델 원문');
    expect(markdown).toContain('사람이 입력');
    expect(markdown).toContain(GPT);
    expect(markdown).toContain(GEMINI);
  });

  it('refuses the next round without feedback', () => {
    let bench = setGpt(createBench(), GPT, NOW);
    bench = setGemini(bench, GEMINI, NOW);
    const blocked = openNextRound(bench);
    expect(blocked.accepted).toBe(false);
    expect(blocked.reason).toContain('피드백');
    expect(openRound(blocked.bench).roundNumber).toBe(1);
  });

  it('preserves round 1 when round 2 opens', () => {
    let bench = setBusiness(createBench(), { businessName: '모회사', businessPlan: PLAN });
    bench = setGpt(bench, GPT, NOW);
    bench = setGemini(bench, GEMINI, NOW);
    bench = setFeedback(bench, '원장으로 입금을 확인하기 전이다.', NOW);
    const opened = openNextRound(bench);
    expect(opened.accepted).toBe(true);
    expect(opened.reason).toContain('이전 원문은 유지한다');
    const first = opened.bench.rounds[0];
    const second = opened.bench.rounds[1];
    expect(first.sealed).toBe(true);
    expect(first.gptText).toBe(GPT);
    expect(first.geminiText).toBe(GEMINI);
    expect(first.feedback).toContain('원장');
    expect(second.roundNumber).toBe(2);
    expect(second.gptText).toBe('');
    expect(second.geminiText).toBe('');
    expect(second.businessPlan).toBe(PLAN);
    expect(second.inputPrompt).toContain('원장으로 입금을 확인하기 전이다.');
    expect(second.inputPrompt).toContain('모델 API에 보내지 않는다');
    expect(presence(second.gptText)).toBe('미입력');
    expect(progressLabel(second)).toContain('GPT 원문 미입력');
    const edited = setGpt(opened.bench, '라운드 2 원문', NOW);
    expect(edited.rounds[0].gptText).toBe(GPT);
    expect(edited.rounds[1].gptText).toBe('라운드 2 원문');
    expect(setBusiness(edited, { businessName: '다른 이름', businessPlan: '다른 계획' }).rounds[1].inputPrompt).toBe(
      second.inputPrompt,
    );
  });

  it('round-trips a long record without promoting it to a live model call', () => {
    const longPlan = `계획 ${'가'.repeat(20_000)}`;
    let bench = setBusiness(createBench(), { businessName: '긴 사업', businessPlan: longPlan });
    bench = setGpt(bench, `GPT ${'나'.repeat(8_000)}`, NOW);
    bench = setGemini(bench, `Gemini ${'다'.repeat(8_000)}`, NOW);
    const restored = parseBench(JSON.parse(JSON.stringify(bench)));
    expect(restored?.rounds[0].businessPlan).toBe(longPlan);
    expect(restored?.liveModelCall).toBe(false);
    expect(restored?.permanent).toBe(false);
    expect(nextRoundPrompt(openRound(bench)).length).toBeGreaterThan(20_000);
  });

  it('sends analytics without the plan or the pasted originals', () => {
    const screen = readFileSync(
      path.resolve(__dirname, '../../components/validation-bench-screen.tsx'),
      'utf8',
    );
    const calls = screen.match(/recordFunnelEvent\([\s\S]*?\}\);/g) ?? [];
    expect(calls.length).toBe(3);
    for (const call of calls) {
      expect(call.includes('businessPlan')).toBe(false);
      expect(call.includes('gptText')).toBe(false);
      expect(call.includes('geminiText')).toBe(false);
      expect(call.includes('manualSynthesis')).toBe(false);
      expect(call.includes('feedback')).toBe(false);
      expect(call.includes('message:')).toBe(false);
      expect(call.includes("screen: '/validation-bench'")).toBe(true);
    }
  });

  it('rejects a record that claims permanent storage or a live model call', () => {
    const bench = createBench();
    expect(parseBench({ ...bench, permanent: true })).toBeNull();
    expect(parseBench({ ...bench, liveModelCall: true })).toBeNull();
    expect(parseBench({ ...bench, storage: 'database' })).toBeNull();
    expect(parseBench({ ...bench, rounds: [] })).toBeNull();
  });
});
