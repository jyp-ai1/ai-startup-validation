import type {
  LaunchLensDomainContext,
} from '@repo/types/domain/launchlens-domain';

import { evaluateDomainTrust } from './domain/domain-trust-rules';
import {
  extractDocumentEntities,
  mapEntitiesToLegacyCustomer,
  mapEntitiesToLegacyIdea,
} from './domain/extract-document-entities';
import type {
  SmartIntakeAnalysis,
  SmartIntakeFieldId,
  SmartIntakeImportSource,
  SmartIntakeMissingId,
  SmartIntakePricingChoice,
} from './v2-smart-intake-types';
import type { DemoProjectDraft } from './v2-demo-project-store';

function isBinaryPlaceholder(text: string, source: SmartIntakeImportSource): boolean {
  if (source === 'pdf') {
    return (
      text.includes('PDF 본문은 아직 추출되지 않았습니다') ||
      text.includes('PDF 문서를 불러왔습니다') ||
      text.includes('PDF 사업계획서를 불러왔습니다')
    );
  }
  if (source === 'docx') return text.includes('Word 문서를 불러왔습니다');
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

  const serviceName =
    mapEntitiesToLegacyIdea(entities, text) ||
    lines[0]?.replace(/^[#\-\*]\s*/, '').slice(0, 40) ||
    findSection(text, ['서비스', 'service', '프로젝트', 'product']) ||
    '내 프로젝트';

  const tagline =
    lines[1]?.slice(0, 80) ||
    findSection(text, ['한줄', '소개', 'summary', 'tagline', 'overview']) ||
    lines[0]?.slice(0, 80) ||
    serviceName;

  const problem =
    findSection(text, ['문제', 'problem', 'pain', '불편', '과제']) ||
    (text.length > 20 && !isBinaryPlaceholder(text, source) ? text.slice(0, 160) : '');

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

export async function readSmartIntakeFile(
  file: File,
): Promise<{ text: string; source: SmartIntakeImportSource; fileName: string }> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'txt';
  if (ext === 'pdf') {
    const demoText = `# ${fileName}\n\nPDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;
    return { text: demoText, source: 'pdf', fileName };
  }
  if (ext === 'docx') {
    const demoText = 'Word 사업계획서를 불러왔습니다. AI PM이 핵심 섹션을 추출합니다.';
    return { text: demoText, source: 'docx', fileName };
  }
  if (ext === 'md' || ext === 'markdown') {
    return { text: await file.text(), source: 'md', fileName };
  }
  return { text: await file.text(), source: 'txt', fileName };
}

export function isSmartIntakeContentValid(content: string): boolean {
  return content.trim().length >= 40;
}
