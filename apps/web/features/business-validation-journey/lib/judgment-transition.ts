import { addCapture, type PageCapture } from './answer-redelivery';

export const LOOP_ROUND_CAP = 4;

export type ExecutionKind =
  | 'not_run'
  | 'browser_failed'
  | 'model_failed'
  | 'empty_response'
  | 'key_missing'
  | 'duplicate_evidence'
  | 'capture_recorded'
  | 'round_cap_held';

export type JudgmentSnapshot = {
  text: string;
  status: 'judgment_deferred' | 'judgment_provisional';
  verifiedFact: false;
  causeIds: string[];
  captureId: string | null;
  sourceUrl: string | null;
  excerpt: string | null;
};

export type TransitionResult = {
  judgment: JudgmentSnapshot;
  captures: PageCapture[];
  execution: ExecutionKind;
  accepted: boolean;
  reason: string;
  heldForCap: boolean;
};

export function applyEvidenceTransition(input: {
  previous: JudgmentSnapshot;
  captures: PageCapture[];
  capture?: PageCapture | null;
  proposedText?: string | null;
  failure?: Exclude<ExecutionKind, 'not_run' | 'duplicate_evidence' | 'capture_recorded' | 'round_cap_held'> | null;
  round: number;
}): TransitionResult {
  const heldForCap = input.round >= LOOP_ROUND_CAP;
  if (heldForCap) {
    return {
      judgment: input.previous,
      captures: input.captures,
      execution: 'round_cap_held',
      accepted: false,
      reason: '반복 상한에 닿았다. 성공도 실패도 아니고 판단을 유보한다.',
      heldForCap: true,
    };
  }

  if (input.failure) {
    return {
      judgment: input.previous,
      captures: input.captures,
      execution: input.failure,
      accepted: false,
      reason: failureReason(input.failure),
      heldForCap: false,
    };
  }

  if (!input.capture) {
    return {
      judgment: input.previous,
      captures: input.captures,
      execution: 'not_run',
      accepted: false,
      reason: '새 캡처가 없다. 직전 판단을 유지한다.',
      heldForCap: false,
    };
  }

  const stored = addCapture(input.captures, input.capture);
  if (!stored.added) {
    return {
      judgment: input.previous,
      captures: stored.captures,
      execution: 'duplicate_evidence',
      accepted: false,
      reason: '동일한 근거만 반복되어 재조사를 생략하고 직전 판단을 유지한다.',
      heldForCap: false,
    };
  }

  const proposed = input.proposedText?.trim() ?? '';
  if (!proposed || proposed === input.previous.text) {
    return {
      judgment: {
        ...input.previous,
        captureId: input.capture.id,
        sourceUrl: input.capture.url,
        excerpt: input.capture.excerpt,
      },
      captures: stored.captures,
      execution: 'capture_recorded',
      accepted: false,
      reason: '캡처는 기록했다. 판단 문장은 바꾸지 않는다.',
      heldForCap: false,
    };
  }

  if (/검증된 사실이다|VALIDATED/.test(proposed) || !input.capture.id) {
    return {
      judgment: input.previous,
      captures: stored.captures,
      execution: 'capture_recorded',
      accepted: false,
      reason: '검증된 사실로 올리거나 원인 ID가 없는 변경은 거부한다. 캡처 원본은 남긴다.',
      heldForCap: false,
    };
  }

  return {
    judgment: {
      text: proposed,
      status: 'judgment_provisional',
      verifiedFact: false,
      causeIds: [input.capture.id],
      captureId: input.capture.id,
      sourceUrl: input.capture.url,
      excerpt: input.capture.excerpt,
    },
    captures: stored.captures,
    execution: 'capture_recorded',
    accepted: true,
    reason: '캡처 ID와 출처와 발췌를 변경 원인에 연결했다. 검증된 사실은 아니다.',
    heldForCap: false,
  };
}

export function emptyJudgment(text: string): JudgmentSnapshot {
  return {
    text,
    status: 'judgment_deferred',
    verifiedFact: false,
    causeIds: [],
    captureId: null,
    sourceUrl: null,
    excerpt: null,
  };
}

function failureReason(kind: 'browser_failed' | 'model_failed' | 'empty_response' | 'key_missing'): string {
  if (kind === 'browser_failed') return '브라우저가 페이지를 열지 못했다. 직전 판단과 이력을 유지한다.';
  if (kind === 'model_failed') return '모델 응답이 실패했다. 직전 판단과 이력을 유지한다.';
  if (kind === 'empty_response') return '모델 응답이 비었다. 직전 판단과 이력을 유지한다.';
  return '키가 없다. 호출하지 않았고 직전 판단과 이력을 유지한다.';
}
