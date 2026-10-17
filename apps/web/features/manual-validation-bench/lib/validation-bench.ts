import { compareWebReviews, type WebReviewComparison } from '@/features/business-validation-journey/lib/web-review-comparison';

export const BENCH_SESSION_KEY = 'alabom.validationBench.v1';

export type FieldPresence = '미입력' | '입력됨';
export type RunPresence = '미실행' | '실행됨';

export type BenchRound = {
  roundNumber: number;
  businessName: string;
  businessPlan: string;
  inputPrompt: string;
  gptText: string;
  gptEnteredAt: string | null;
  geminiText: string;
  geminiEnteredAt: string | null;
  manualSynthesis: string;
  manualSynthesisAt: string | null;
  feedback: string;
  feedbackAt: string | null;
  sealed: boolean;
};

export type ValidationBench = {
  storage: 'browser-session';
  permanent: false;
  liveModelCall: false;
  rounds: BenchRound[];
};

export type BenchSynthesis = {
  status: RunPresence;
  source: '미실행' | 'ALABOM 규칙 취합';
  comparison: WebReviewComparison | null;
  reason: string;
};

function emptyRound(roundNumber: number, businessName: string, businessPlan: string, inputPrompt: string): BenchRound {
  return {
    roundNumber,
    businessName,
    businessPlan,
    inputPrompt,
    gptText: '',
    gptEnteredAt: null,
    geminiText: '',
    geminiEnteredAt: null,
    manualSynthesis: '',
    manualSynthesisAt: null,
    feedback: '',
    feedbackAt: null,
    sealed: false,
  };
}

export function createBench(): ValidationBench {
  const plan = '';
  return {
    storage: 'browser-session',
    permanent: false,
    liveModelCall: false,
    rounds: [emptyRound(1, '', plan, plan)],
  };
}

export function presence(text: string): FieldPresence {
  return text.trim() ? '입력됨' : '미입력';
}

export function progressLabel(round: BenchRound): string {
  if (round.sealed) return `라운드 ${round.roundNumber} 보존. 검증 완료 아님.`;
  if (!round.businessPlan.trim()) return '사업계획 미입력. 검증 완료 아님.';
  if (!round.gptText.trim()) return 'GPT 원문 미입력. 검증 완료 아님.';
  if (!round.geminiText.trim()) return 'Gemini 원문 미입력. 규칙 취합 미실행. 검증 완료 아님.';
  if (!round.feedback.trim()) {
    return '두 원문은 입력됨. 규칙 취합은 실행됨. CEO 피드백 미입력. 사실 상태는 미확인. 검증 완료 아님.';
  }
  return '피드백까지 입력됨. 다음 라운드 GPT 재조회는 미실행. 사실 상태는 미확인. 검증 완료 아님.';
}

export function ruleSynthesisCopy(round: BenchRound): string {
  const synthesis = synthesisFor(round);
  if (!synthesis.comparison) return '미실행';
  const comparison = synthesis.comparison;
  return [
    `출처: ${synthesis.source}`,
    '범위: 고정된 S1–S6, A1–A2 문구만 본다. 그 문구가 없으면 사업 전체를 판단한 것이 아니다.',
    `사실 상태: ${comparison.factStatus}`,
    'verifiedFact: false',
    '모델 API 호출: 없음',
    '합의:',
    comparison.agreement.join('\n') || '없음',
    '충돌:',
    comparison.conflict.join('\n') || '없음',
    '근거 부족:',
    comparison.insufficient.join('\n') || '없음',
    '다음 행동:',
    comparison.nextAction,
  ].join('\n');
}

export function openRound(bench: ValidationBench): BenchRound {
  return bench.rounds.find((round) => !round.sealed) ?? bench.rounds[bench.rounds.length - 1];
}

function replaceOpen(bench: ValidationBench, round: BenchRound): ValidationBench {
  return {
    ...bench,
    rounds: bench.rounds.map((item) => (item.roundNumber === round.roundNumber ? round : item)),
  };
}

export function questionLabels(comparison: WebReviewComparison): string[] {
  const labels = [...comparison.conflict, ...comparison.insufficient]
    .map((line) => line.split(':')[0]?.trim() ?? '')
    .filter((label) => /^[SA]\d/.test(label));
  return [...new Set(labels)];
}

export function synthesisFor(round: BenchRound): BenchSynthesis {
  if (!round.gptText.trim() || !round.geminiText.trim()) {
    return {
      status: '미실행',
      source: '미실행',
      comparison: null,
      reason: 'GPT 원문과 Gemini 원문이 모두 있어야 취합한다. 빈 원문으로 취합을 실행하지 않는다.',
    };
  }
  return {
    status: '실행됨',
    source: 'ALABOM 규칙 취합',
    comparison: compareWebReviews(round.gptText, round.geminiText),
    reason: '붙여 넣은 두 원문을 규칙으로 나눴다. 모델 API를 호출하지 않았다. 사실 검증이 아니다.',
  };
}

export function setBusiness(
  bench: ValidationBench,
  input: { businessName: string; businessPlan: string },
): ValidationBench {
  const round = openRound(bench);
  if (round.sealed) return bench;
  const next = {
    ...round,
    businessName: input.businessName,
    businessPlan: input.businessPlan,
  };
  if (round.roundNumber === 1) next.inputPrompt = input.businessPlan;
  return replaceOpen(bench, next);
}

export function setGpt(bench: ValidationBench, text: string, now: string): ValidationBench {
  const round = openRound(bench);
  if (round.sealed) return bench;
  return replaceOpen(bench, { ...round, gptText: text, gptEnteredAt: text.trim() ? now : null });
}

export function setGemini(bench: ValidationBench, text: string, now: string): ValidationBench {
  const round = openRound(bench);
  if (round.sealed) return bench;
  return replaceOpen(bench, { ...round, geminiText: text, geminiEnteredAt: text.trim() ? now : null });
}

export function setManualSynthesis(bench: ValidationBench, text: string, now: string): ValidationBench {
  const round = openRound(bench);
  if (round.sealed) return bench;
  return replaceOpen(bench, {
    ...round,
    manualSynthesis: text,
    manualSynthesisAt: text.trim() ? now : null,
  });
}

export function setFeedback(bench: ValidationBench, text: string, now: string): ValidationBench {
  const round = openRound(bench);
  if (round.sealed) return bench;
  return replaceOpen(bench, { ...round, feedback: text, feedbackAt: text.trim() ? now : null });
}

export function nextRoundPrompt(round: BenchRound): string {
  const synthesis = synthesisFor(round);
  const questions = synthesis.comparison ? questionLabels(synthesis.comparison) : [];
  return [
    `사업명: ${round.businessName || '미입력'}`,
    '사업계획:',
    round.businessPlan || '미입력',
    `이전 라운드: r${round.roundNumber}`,
    'CEO 피드백:',
    round.feedback || '미입력',
    '미해결 질문:',
    questions.length ? questions.join('\n') : '미실행',
    '이 입력을 GPT 웹에 다시 넣는다. ALABOM은 이 문장을 모델 API에 보내지 않는다.',
  ].join('\n');
}

export function openNextRound(bench: ValidationBench): { bench: ValidationBench; accepted: boolean; reason: string } {
  const round = openRound(bench);
  if (round.sealed) {
    return { bench, accepted: false, reason: '열린 라운드가 없다.' };
  }
  if (!round.gptText.trim() || !round.geminiText.trim()) {
    return { bench, accepted: false, reason: '원문이 비어 있다. 다음 라운드를 열지 않고 취합은 미실행으로 둔다.' };
  }
  if (!round.feedback.trim()) {
    return { bench, accepted: false, reason: 'CEO 피드백이 비어 있다. 다음 라운드를 열지 않는다.' };
  }
  const sealed = { ...round, sealed: true };
  const prompt = nextRoundPrompt(sealed);
  const next = emptyRound(round.roundNumber + 1, round.businessName, round.businessPlan, prompt);
  return {
    bench: {
      ...bench,
      rounds: bench.rounds.map((item) => (item.roundNumber === sealed.roundNumber ? sealed : item)).concat(next),
    },
    accepted: true,
    reason: '다음 라운드를 열었다. 이전 원문은 유지한다. GPT 재조회는 아직 미실행이다.',
  };
}

export function toMarkdown(bench: ValidationBench): string {
  const parts = [
    '# ALABOM 수동 검증 기록',
    '저장: 브라우저 세션. 영구 저장 아님. 모델 API 호출 없음.',
    '',
  ];
  for (const round of bench.rounds) {
    const synthesis = synthesisFor(round);
    parts.push(
      `## 라운드 ${round.roundNumber} · ${round.sealed ? '보존' : '진행 중'}`,
      `사업명 (${presence(round.businessName)}): ${round.businessName || '미입력'}`,
      `사업계획 (${presence(round.businessPlan)}):`,
      round.businessPlan || '미입력',
      `이 라운드 입력 (${presence(round.inputPrompt)}) [ALABOM 구성 또는 사업계획]:`,
      round.inputPrompt || '미입력',
      `GPT 원문 (${presence(round.gptText)}) [사람이 붙여 넣은 모델 원문]:`,
      round.gptText || '미입력',
      `Gemini 원문 (${presence(round.geminiText)}) [사람이 붙여 넣은 모델 원문]:`,
      round.geminiText || '미입력',
      `규칙 취합 (${synthesis.status}) [${synthesis.source}]:`,
      synthesis.comparison
        ? [
            ...synthesis.comparison.agreement,
            ...synthesis.comparison.conflict,
            ...synthesis.comparison.insufficient,
            synthesis.comparison.nextAction,
          ].join('\n')
        : '미실행',
      `수동 종합 (${presence(round.manualSynthesis)}) [사람이 입력]:`,
      round.manualSynthesis || '미입력',
      `CEO 피드백 (${presence(round.feedback)}) [사람이 입력]:`,
      round.feedback || '미입력',
      '',
    );
  }
  return parts.join('\n');
}

function isRound(value: unknown): value is BenchRound {
  if (!value || typeof value !== 'object') return false;
  const round = value as Partial<BenchRound>;
  return (
    typeof round.roundNumber === 'number' &&
    typeof round.businessName === 'string' &&
    typeof round.businessPlan === 'string' &&
    typeof round.inputPrompt === 'string' &&
    typeof round.gptText === 'string' &&
    typeof round.geminiText === 'string' &&
    typeof round.manualSynthesis === 'string' &&
    typeof round.feedback === 'string' &&
    typeof round.sealed === 'boolean'
  );
}

export function parseBench(value: unknown): ValidationBench | null {
  if (!value || typeof value !== 'object') return null;
  const bench = value as Partial<ValidationBench>;
  if (bench.storage !== 'browser-session' || bench.permanent !== false || bench.liveModelCall !== false) return null;
  if (!Array.isArray(bench.rounds) || bench.rounds.length === 0 || !bench.rounds.every(isRound)) return null;
  return bench as ValidationBench;
}
