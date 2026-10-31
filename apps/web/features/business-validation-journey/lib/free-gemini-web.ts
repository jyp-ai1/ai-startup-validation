/**
 * User-delivered text from the free Gemini web page.
 * This module does not call a model API and does not read gemini.google.com.
 */
export const FREE_GEMINI_WEB_PATH = {
  selected: 'user_paste',
  bookmarkReturnsReply: false,
  extensionReturnsReply: false,
  readsGeminiPage: false,
  apiCalled: false,
  liveWebCapture: 'NOT_RUN' as const,
} as const;

export const FREE_GEMINI_WEB_SESSION_KEY = 'alabom.freeGeminiWeb.v1';

const SOURCE_URL = /^https?:\/\/\S+$/;

export type FreeGeminiWebRound = {
  executionId: string;
  round: 1 | 2;
  parentExecutionId: string | null;
  businessInput: string;
  prompt: string;
  feedback: string | null;
  content: string;
  sourceUrls: string[];
  sourceStatus: 'user_supplied' | 'absent';
  retrievedAt: string;
  evidence: 'user_paste';
  liveWebCapture: false;
  readsGeminiPage: false;
  apiCalled: false;
  verifiedFact: false;
  webRoundtrip: 'NOT_RUN';
};

export type FreeGeminiWebLog = {
  rounds: FreeGeminiWebRound[];
};

export function emptyFreeGeminiWebLog(): FreeGeminiWebLog {
  return { rounds: [] };
}

export function buildFreeGeminiPrompt(input: {
  business: string;
  customer?: string;
  problem?: string;
}): string {
  return [
    '무료 Gemini 웹에서 사람이 직접 실행할 1차 질의이다.',
    'ALABOM은 이 문장을 Gemini 웹이나 모델 API에 보내지 않는다.',
    '사실, 가정, 출처 URL을 구분해 적어라.',
    '확인한 출처 URL이 없으면 출처는 없다고 적어라.',
    `사업: ${input.business.trim()}`,
    input.customer?.trim() ? `고객: ${input.customer.trim()}` : '',
    input.problem?.trim() ? `문제: ${input.problem.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildFreeGeminiFollowUp(input: {
  first: FreeGeminiWebRound;
  feedback: string;
}): string {
  return [
    '무료 Gemini 웹에서 사람이 직접 실행할 2차 질의이다.',
    'ALABOM은 이 문장을 Gemini 웹이나 모델 API에 보내지 않는다.',
    '1차 원문을 지우지 말고, 사용자 피드백을 반영해 다시 검토하라.',
    '사실, 가정, 출처 URL을 구분해 적어라. 새 출처 URL이 없으면 출처는 없다고 적어라.',
    '1차 질의:',
    input.first.prompt,
    '1차 응답 원문:',
    input.first.content,
    '사용자 피드백:',
    input.feedback.trim(),
  ].join('\n');
}

export function parseUserSourceUrls(raw: string): { urls: string[]; ignored: string[] } {
  const urls: string[] = [];
  const ignored: string[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\n/)) {
    const value = line.trim();
    if (!value) continue;
    if (!SOURCE_URL.test(value) || seen.has(value)) {
      if (!SOURCE_URL.test(value)) ignored.push(value);
      continue;
    }
    seen.add(value);
    urls.push(value);
  }
  return { urls, ignored };
}

export function acceptFreeGeminiWebPaste(
  log: FreeGeminiWebLog,
  input: {
    executionId: string;
    round: 1 | 2;
    business: string;
    customer?: string;
    problem?: string;
    content: string;
    sourceUrlText?: string;
    feedback?: string;
    parentExecutionId?: string | null;
    now: string;
  },
): { log: FreeGeminiWebLog; accepted: boolean; reason: string; record: FreeGeminiWebRound | null } {
  const existing = log.rounds.find((round) => round.executionId === input.executionId);
  if (existing) {
    return { log, accepted: false, reason: '같은 실행 ID는 다시 저장하지 않는다.', record: existing };
  }
  const content = input.content.trim();
  if (!content) {
    return { log, accepted: false, reason: '원문이 없어 저장하지 않는다.', record: null };
  }

  let parent: FreeGeminiWebRound | null = null;
  let prompt = '';
  let businessInput = [input.business.trim(), input.customer?.trim(), input.problem?.trim()]
    .filter(Boolean)
    .join('\n');
  if (input.round === 2) {
    parent = log.rounds.find((round) => round.executionId === input.parentExecutionId) ?? null;
    if (!parent || parent.round !== 1 || !parent.content.trim()) {
      return { log, accepted: false, reason: '1차 원문이 없어 2차 질의를 만들지 않는다.', record: null };
    }
    if (!input.feedback?.trim()) {
      return { log, accepted: false, reason: '피드백이 없어 2차 질의를 만들지 않는다.', record: null };
    }
    prompt = buildFreeGeminiFollowUp({ first: parent, feedback: input.feedback });
    businessInput = parent.businessInput;
  } else if (!input.business.trim()) {
    return { log, accepted: false, reason: '사업 입력이 없어 질의를 만들지 않는다.', record: null };
  } else {
    prompt = buildFreeGeminiPrompt({
      business: input.business,
      customer: input.customer,
      problem: input.problem,
    });
  }

  const sources = parseUserSourceUrls(input.sourceUrlText ?? '');
  const record: FreeGeminiWebRound = {
    executionId: input.executionId,
    round: input.round,
    parentExecutionId: parent?.executionId ?? null,
    businessInput,
    prompt,
    feedback: input.feedback?.trim() || null,
    content,
    sourceUrls: sources.urls,
    sourceStatus: sources.urls.length > 0 ? 'user_supplied' : 'absent',
    retrievedAt: input.now,
    evidence: 'user_paste',
    liveWebCapture: false,
    readsGeminiPage: false,
    apiCalled: false,
    verifiedFact: false,
    webRoundtrip: 'NOT_RUN',
  };
  return {
    log: { rounds: [...log.rounds, record] },
    accepted: true,
    reason:
      sources.urls.length > 0
        ? '붙여 넣은 원문과 사용자가 적은 URL을 저장했다. Gemini 웹 회수는 NOT RUN이다.'
        : '붙여 넣은 원문을 저장했다. 출처 URL은 없다. Gemini 웹 회수는 NOT RUN이다.',
    record,
  };
}

export function loadFreeGeminiWebLog(storage: Pick<Storage, 'getItem'> | null): FreeGeminiWebLog {
  if (!storage) return emptyFreeGeminiWebLog();
  try {
    const raw = storage.getItem(FREE_GEMINI_WEB_SESSION_KEY);
    if (!raw) return emptyFreeGeminiWebLog();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as FreeGeminiWebLog).rounds)) {
      return emptyFreeGeminiWebLog();
    }
    return { rounds: (parsed as FreeGeminiWebLog).rounds };
  } catch {
    return emptyFreeGeminiWebLog();
  }
}

export function saveFreeGeminiWebLog(storage: Pick<Storage, 'setItem'> | null, log: FreeGeminiWebLog): void {
  storage?.setItem(FREE_GEMINI_WEB_SESSION_KEY, JSON.stringify(log));
}
