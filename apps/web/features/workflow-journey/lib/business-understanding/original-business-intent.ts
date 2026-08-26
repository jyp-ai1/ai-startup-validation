/**
 * P0-1 — Pin Original Business Intent at project seed / first input.
 * Current Understanding must stay linked; drift blocks Final Review GO.
 */

const STORAGE_PREFIX = 'launchlens.originalBusinessIntent.';

export type OriginalBusinessIntent = {
  version: 1;
  text: string;
  pinnedAt: string;
  source: 'document_seed' | 'first_input';
};

function storageKey(projectId?: string): string {
  return `${STORAGE_PREFIX}${projectId?.trim() || 'default'}`;
}

/** Pin once — never overwrite after first seed. */
export function pinOriginalBusinessIntent(
  text: string,
  projectId?: string,
  source: OriginalBusinessIntent['source'] = 'document_seed',
): OriginalBusinessIntent | null {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 8) return null;

  const existing = loadOriginalBusinessIntent(projectId);
  if (existing) return existing;

  const intent: OriginalBusinessIntent = {
    version: 1,
    text: trimmed.slice(0, 500),
    pinnedAt: new Date().toISOString(),
    source,
  };

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(storageKey(projectId), JSON.stringify(intent));
    } catch {
      // ignore quota
    }
  }
  return intent;
}

export function loadOriginalBusinessIntent(projectId?: string): OriginalBusinessIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OriginalBusinessIntent;
    if (parsed.version !== 1 || typeof parsed.text !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

const TOURISM_SIGNALS =
  /관광|여행|투어|외국인|서울|맞춤|체험|FIT|가이드|현지/i;
const B2B_SAAS_SIGNALS =
  /B2B|SaaS|구독\s*플랫폼|엔터프라이즈|중소기업\s*대상|API\s*플랫폼|B2B\s*SaaS/i;

function extractKeywords(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type IntentDriftEvaluation = {
  drifted: boolean;
  rationale: string;
  overlapScore: number;
};

/**
 * Detect domain drift between pinned seed and current business understanding text.
 * Tourism seed → B2B SaaS summary = drift (CPO RC-9).
 */
export function evaluateIntentDrift(
  original: string,
  current: string,
): IntentDriftEvaluation {
  const orig = original.trim();
  const curr = current.trim();
  if (!orig || !curr) {
    return { drifted: false, rationale: '비교할 텍스트가 없습니다.', overlapScore: 1 };
  }

  const origTourism = TOURISM_SIGNALS.test(orig);
  const currTourism = TOURISM_SIGNALS.test(curr);
  const currB2B = B2B_SAAS_SIGNALS.test(curr);

  if (origTourism && currB2B && !currTourism) {
    return {
      drifted: true,
      rationale:
        '원래 의도(관광·맞춤 경험)와 현재 이해(B2B/SaaS)가 다릅니다. 사업 정체성을 먼저 맞춰야 합니다.',
      overlapScore: jaccard(extractKeywords(orig), extractKeywords(curr)),
    };
  }

  const overlap = jaccard(extractKeywords(orig), extractKeywords(curr));
  if (overlap < 0.12 && curr.length >= 24 && orig.length >= 24) {
    return {
      drifted: true,
      rationale:
        '시작할 때 적어 둔 사업 의도와 지금 이해가 크게 어긋납니다. 한 줄 사업 정의를 다시 맞춰 주세요.',
      overlapScore: overlap,
    };
  }

  return {
    drifted: false,
    rationale: '원래 사업 의도와 현재 이해가 정렬되어 있습니다.',
    overlapScore: overlap,
  };
}

/** Build a single-line current business summary from spine + memory facts. */
export function summarizeCurrentBusinessIntent(input: {
  spineBusiness: string;
  spineCustomer: string;
  documentExcerpt?: string | null;
}): string {
  const parts = [
    input.spineBusiness,
    input.spineCustomer,
    input.documentExcerpt?.slice(0, 120) ?? '',
  ]
    .map((p) => p?.trim() ?? '')
    .filter((p) => p.length >= 4 && !/아직 확인|pending/i.test(p));
  return parts.join(' · ').slice(0, 400);
}
