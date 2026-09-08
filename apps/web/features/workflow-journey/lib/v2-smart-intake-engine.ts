import type {
  LaunchLensDomainContext,
} from '@repo/types/domain/launchlens-domain';

import { evaluateDomainTrust } from './domain/domain-trust-rules';
import {
  extractDocumentEntities,
  mapEntitiesToLegacyCustomer,
  mapEntitiesToLegacyIdea,
} from './domain/extract-document-entities';
import { detectWorkspaceDocumentPlaceholder, looksLikeDocumentFileName } from './business-understanding/workspace-document-eligibility';
import type {
  SmartIntakeAnalysis,
  SmartIntakeFieldId,
  SmartIntakeImportSource,
  SmartIntakeMissingId,
  SmartIntakePricingChoice,
} from './v2-smart-intake-types';
import type { DemoProjectDraft } from './v2-demo-project-store';

function isBinaryPlaceholder(text: string, source: SmartIntakeImportSource): boolean {
  const placeholder = detectWorkspaceDocumentPlaceholder(text);
  if (source === 'pdf') return placeholder === 'pdf';
  if (source === 'docx') return placeholder === 'docx';
  return false;
}

function createUnknownEntities(): LaunchLensDomainContext {
  const unknown = { value: null, basis: 'unknown' as const };
  return {
    founder: unknown,
    business: { ...unknown, model: null, name: null },
    customer: unknown,
    product: unknown,
    market: unknown,
    competitor: unknown,
  };
}

function findSection(text: string, keywords: string[]): string {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.toLowerCase() ?? '';
    if (keywords.some((k) => line.includes(k))) {
      const next = lines.slice(i, i + 3).join(' ').trim();
      if (next.length > 8) return next.slice(0, 120);
    }
  }
  return '';
}

function hasKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function analyzeSmartIntakeDocument(
  raw: string,
  source: SmartIntakeImportSource = 'paste',
): SmartIntakeAnalysis {
  const text = raw.trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const entities = isBinaryPlaceholder(text, source)
    ? createUnknownEntities()
    : extractDocumentEntities(text);
  const domainTrust = evaluateDomainTrust(entities);

  const rawServiceName =
    mapEntitiesToLegacyIdea(entities, text) ||
    lines[0]?.replace(/^[#\-\*]\s*/, '').slice(0, 40) ||
    findSection(text, ['서비스', 'service', '프로젝트', 'product']) ||
    '내 프로젝트';
  // S15 P0-1 — never use upload filename / placeholder heading as serviceName
  const serviceName =
    looksLikeDocumentFileName(rawServiceName) || isBinaryPlaceholder(text, source)
      ? '내 프로젝트'
      : rawServiceName;

  const rawTagline =
    lines[1]?.slice(0, 80) ||
    findSection(text, ['한줄', '소개', 'summary', 'tagline', 'overview']) ||
    lines[0]?.slice(0, 80) ||
    serviceName;
  const tagline = looksLikeDocumentFileName(rawTagline) ? serviceName : rawTagline;

  const problem =
    findSection(text, ['문제', 'problem', 'pain', '불편', '과제']) || '';

  const customer = mapEntitiesToLegacyCustomer(entities);

  const market =
    (entities.market.value ??
      findSection(text, ['시장', 'market', 'tam', 'sam'])) ||
    (entities.business.model === 'B2C' ? 'B2C 시장' : '');

  const bm =
    findSection(text, ['bm', '비즈니스', 'business model', '수익', 'pricing', '가격']) ||
    (entities.business.model ? `${entities.business.model} 모델` : '');

  const competition =
    (entities.competitor.value ??
      findSection(text, ['경쟁', 'competitor', 'competition', '대안'])) || '';

  const extracted: Record<SmartIntakeFieldId, boolean> = {
    problem: problem.length >= 8,
    customer: customer.length >= 4 && entities.customer.basis === 'document',
    market: market.length >= 4,
    bm: bm.length >= 4,
    competition: competition.length >= 4,
  };

  const documentBackedCount = [
    entities.founder.basis === 'document',
    entities.business.basis === 'document',
    entities.customer.basis === 'document',
    entities.market.basis === 'document',
    entities.competitor.basis === 'document',
  ].filter(Boolean).length;

  const completenessScore = Math.min(95, 40 + documentBackedCount * 11);
  const completenessStars = documentBackedCount >= 4 ? 5 : documentBackedCount >= 3 ? 4 : 3;

  const missing: SmartIntakeMissingId[] = [];
  if (!hasKeyword(text, ['가격', 'pricing', '구독', 'subscription', '무료', 'free'])) {
    missing.push('pricing');
  }
  if (!hasKeyword(text, ['인터뷰', 'interview', '고객 검증'])) {
    missing.push('customerInterview');
  }
  if (!hasKeyword(text, ['gtm', 'go-to-market', '출시', 'launch'])) {
    missing.push('gtm');
  }
  if (domainTrust.mustConfirmCustomer) {
    missing.push('customerInterview');
  }

  return {
    serviceName,
    tagline,
    problem: problem || tagline,
    customer,
    market: market || '',
    bm: bm || '',
    competition: competition || '',
    extracted,
    missing,
    completenessScore,
    completenessStars,
    entities,
    domainTrust,
  };
}

export function buildDraftFromAnalysis(
  analysis: SmartIntakeAnalysis,
  pastedContent: string,
  source: SmartIntakeImportSource,
  pricingModel?: SmartIntakePricingChoice,
  fileName?: string,
  priceLevel?: string,
): DemoProjectDraft {
  return {
    serviceName: analysis.serviceName,
    tagline: analysis.tagline,
    customer: analysis.customer,
    problem: analysis.problem,
    pastedContent,
    importSource: source,
    fileName,
    pricingModel,
    priceLevel,
    completenessScore: analysis.completenessScore,
    extracted: analysis.extracted,
    missing: analysis.missing,
  };
}

export class SmartIntakeFileReadError extends Error {
  readonly reason: 'unsupported' | 'empty' | 'parse_failed' | 'network';

  constructor(reason: SmartIntakeFileReadError['reason'], message: string) {
    super(message);
    this.name = 'SmartIntakeFileReadError';
    this.reason = reason;
  }
}

async function readBinaryIntakeFile(
  file: File,
): Promise<{ text: string; source: SmartIntakeImportSource; fileName: string }> {
  const formData = new FormData();
  formData.append('file', file);

  let response: Response;
  try {
    response = await fetch('/api/intake/extract-document', {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new SmartIntakeFileReadError('network', 'Document extraction request failed');
  }

  const payload = (await response.json().catch(() => null)) as
    | { ok: true; text: string; source: SmartIntakeImportSource; fileName: string }
    | { ok: false; reason?: string; detail?: string }
    | null;

  if (!response.ok || !payload || payload.ok !== true || !payload.text?.trim()) {
    const reason =
      payload && 'reason' in payload && payload.reason === 'unsupported'
        ? 'unsupported'
        : payload && 'reason' in payload && payload.reason === 'parse_failed'
          ? 'parse_failed'
          : 'empty';
    throw new SmartIntakeFileReadError(
      reason,
      payload && 'detail' in payload && payload.detail
        ? payload.detail
        : 'Could not extract text from document',
    );
  }

  return {
    text: payload.text.trim(),
    source: payload.source,
    fileName: payload.fileName ?? file.name,
  };
}

export async function readSmartIntakeFile(
  file: File,
): Promise<{ text: string; source: SmartIntakeImportSource; fileName: string }> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'txt';

  if (ext === 'pdf' || ext === 'docx' || ext === 'doc') {
    return readBinaryIntakeFile(file);
  }

  if (ext === 'md' || ext === 'markdown') {
    const text = (await file.text()).trim();
    if (text.length < 8) {
      throw new SmartIntakeFileReadError('empty', 'Document has insufficient text');
    }
    return { text, source: 'md', fileName };
  }

  const text = (await file.text()).trim();
  if (text.length < 8) {
    throw new SmartIntakeFileReadError('empty', 'Document has insufficient text');
  }
  return { text, source: 'txt', fileName };
}

export function isSmartIntakeContentValid(content: string): boolean {
  return content.trim().length >= 40;
}
