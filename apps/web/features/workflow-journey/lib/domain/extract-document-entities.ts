import type {
  BusinessModel,
  DomainEntityField,
  LaunchLensDomainContext,
} from '@repo/types/domain/launchlens-domain';

const FOUNDER_ARCHETYPES = [
  '예비창업자',
  '예비 창업자',
  '스타트업 대표',
  '1인 창업',
  '창업자',
  '대표',
  'pm',
  '프로덕트 매니저',
] as const;

function firstLine(text: string): string {
  return text.split('\n').find((l) => l.trim().length > 0)?.trim() ?? '';
}

function findSection(text: string, keywords: string[]): string {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.toLowerCase() ?? '';
    if (keywords.some((k) => line.includes(k))) {
      const chunk = lines.slice(i, i + 4).join(' ').trim();
      if (chunk.length > 8) return chunk.slice(0, 160);
    }
  }
  return '';
}

function hasKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function isFounderArchetypeOnly(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return FOUNDER_ARCHETYPES.some(
    (a) => normalized === a.toLowerCase() || normalized.includes(a.toLowerCase()),
  );
}

function detectBusinessModel(text: string): BusinessModel | null {
  if (hasKeyword(text, ['b2c', 'b-to-c', '일반인', '소비자', '대중', '리테일'])) return 'B2C';
  if (hasKeyword(text, ['b2b', 'b-to-b', '기업 고객', '엔터프라이즈', '사업자 고객'])) return 'B2B';
  if (hasKeyword(text, ['b2g', '공공', '정부', '관공서'])) return 'B2G';
  return null;
}

function extractFounder(text: string): DomainEntityField {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('타겟') || lower.includes('고객') || lower.includes('customer')) {
      continue;
    }
    if (['대표', '창업자', '예비창업', 'founder', 'ceo'].some((k) => lower.includes(k))) {
      if (hasKeyword(line, ['예비창업'])) {
        return { value: '예비창업자', basis: 'document' };
      }
      return { value: line.slice(0, 60), basis: 'document' };
    }
  }
  if (hasKeyword(text, ['예비창업자', '예비 창업'])) {
    return { value: '예비창업자', basis: 'document' };
  }
  return { value: null, basis: 'unknown' };
}

function extractBusinessName(text: string): DomainEntityField {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const title =
    lines[0]?.replace(/^[#\-\*]\s*/, '').slice(0, 48) ||
    findSection(text, ['서비스', 'service', '프로젝트', 'product', '사업명', '회사']);
  if (title.length >= 2) {
    return { value: title, basis: 'document' };
  }
  return { value: null, basis: 'unknown' };
}

function extractCustomer(
  text: string,
  model: BusinessModel | null,
  founder: DomainEntityField,
): DomainEntityField {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let raw = '';
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (['타겟', '타깃', '고객', 'customer', 'target', '주요 고객'].some((k) => lower.includes(k))) {
      raw = line;
      break;
    }
  }
  if (!raw) {
    raw = findSection(text, ['타겟', '타깃', '고객', 'customer', 'target', '주요 고객', '사용자', 'user', '구매']) || '';
  }

  const candidate = raw.replace(/^(.*?)(타겟\s*고객|타겟|타깃|고객|customer|target)[\s:：]*/i, '').trim();

  if (!candidate) {
    if (model === 'B2C' && hasKeyword(text, ['일반인', '소비자', '대중', '외국인', '여행객'])) {
      return { value: '일반인 (B2C)', basis: 'document' };
    }
    return { value: null, basis: 'unknown' };
  }

  if (isFounderArchetypeOnly(candidate)) {
    return { value: null, basis: 'needs_confirmation' };
  }

  if (
    model === 'B2C' &&
    founder.value &&
    candidate.includes(founder.value.slice(0, 6))
  ) {
    return { value: null, basis: 'needs_confirmation' };
  }

  if (hasKeyword(candidate, ['예비창업', '창업자', '대표', 'startup founder'])) {
    if (model === 'B2C') {
      return { value: null, basis: 'needs_confirmation' };
    }
    return { value: candidate.slice(0, 80), basis: 'inferred' };
  }

  return { value: candidate.slice(0, 80), basis: 'document' };
}

function fieldFromSection(text: string, keywords: string[]): DomainEntityField {
  const value = findSection(text, keywords);
  if (value.length >= 4) {
    return { value: value.slice(0, 120), basis: 'document' };
  }
  return { value: null, basis: 'unknown' };
}

/**
 * Entity-first extraction for business plans / pasted docs.
 * AI PM must consume this before inferring Customer from founder language.
 */
export function extractDocumentEntities(raw: string): LaunchLensDomainContext {
  const text = raw.trim();
  const model = detectBusinessModel(text);
  const founder = extractFounder(text);
  const businessName = extractBusinessName(text);
  const customer = extractCustomer(text, model, founder);

  return {
    founder,
    business: {
      ...businessName,
      name: businessName.value,
      model,
    },
    customer,
    product: fieldFromSection(text, ['제품', 'product', '서비스', 'mvp', '솔루션']),
    market: fieldFromSection(text, ['시장', 'market', 'tam', 'sam']),
    competitor: fieldFromSection(text, ['경쟁', 'competitor', 'competition', '대안']),
  };
}

export function mapEntitiesToLegacyCustomer(entities: LaunchLensDomainContext): string {
  if (entities.customer.basis === 'needs_confirmation' || entities.customer.basis === 'unknown') {
    return '';
  }
  return entities.customer.value ?? '';
}

export function mapEntitiesToLegacyIdea(entities: LaunchLensDomainContext, fallback: string): string {
  return entities.business.name ?? entities.product.value ?? firstLine(fallback) ?? '';
}
