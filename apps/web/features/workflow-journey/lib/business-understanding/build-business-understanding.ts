import type {
  BusinessUnderstanding,
  CustomerMention,
  UnderstandingField,
  UnderstandingFieldStatus,
} from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { extractDocumentEntities } from '../domain/extract-document-entities';

const CUSTOMER_MENTION_PATTERNS: Array<{ label: string; keywords: string[]; quote: string }> = [
  { label: 'MZ 관광객', keywords: ['mz', 'mz세대', 'mz 세대'], quote: 'MZ' },
  { label: 'FIT 관광객', keywords: ['fit', '개별 관광', '자유여행'], quote: 'FIT' },
  { label: '방한 외국인', keywords: ['방한', '외국인 관광', '외국인'], quote: '외국인' },
  {
    label: '전통주 관심 소비자',
    keywords: ['전통주 관심', '전통주 소비', '전통주 애호'],
    quote: '전통주',
  },
  { label: '일반 소비자', keywords: ['일반 소비', '일반인'], quote: '일반인' },
];

const PARTNER_KEYWORDS = ['양조장', '제휴 파트너', 'b2b 파트너', '파트너사'];
const REVENUE_KEYWORDS = ['수익', 'revenue', '매출', '제휴', '데이터 리포트', '구독'];

const CUSTOMER_MISSING_LINE =
  '실제 서비스를 사용하는 사람과 결제하는 사람이 누구인지는 문서에서 확인하지 못했습니다.';
const CUSTOMER_MISSING_NO_SECTION = '문서에서 고객을 특정할 수 있는 표현을 확인하지 못했습니다.';
const CUSTOMER_NEXT_STEP = '다음으로 이 부분을 같이 확인하겠습니다.';

const LINES_PER_PAGE = 5;

function lineToPageRef(lineIndex: number): string {
  return `${Math.max(1, Math.ceil((lineIndex + 1) / LINES_PER_PAGE))}page`;
}

function findLineIndex(lines: string[], predicate: (line: string) => boolean): number {
  return lines.findIndex(predicate);
}

type FieldMeta = {
  excerpt?: string | null;
  pageRef?: string | null;
  reasoning?: string | null;
  unknownNote?: string | null;
  confirmedExpressions?: string[] | null;
  missingLine?: string | null;
  nextStep?: string | null;
};

function toField(
  value: string | null,
  status: UnderstandingFieldStatus,
  meta: FieldMeta = {},
): UnderstandingField {
  return {
    value,
    status,
    excerpt: meta.excerpt ?? null,
    pageRef: meta.pageRef ?? null,
    reasoning: meta.reasoning ?? null,
    unknownNote: meta.unknownNote ?? null,
    confirmedExpressions: meta.confirmedExpressions ?? null,
    missingLine: meta.missingLine ?? null,
    nextStep: meta.nextStep ?? null,
  };
}

function extractCustomerMentions(text: string): CustomerMention[] {
  const lower = text.toLowerCase();
  const mentions: CustomerMention[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const { label, keywords, quote } of CUSTOMER_MENTION_PATTERNS) {
    if (!keywords.some((k) => lower.includes(k))) continue;
    const lineIndex = findLineIndex(lines, (l) => keywords.some((k) => l.toLowerCase().includes(k)));
    const line = lineIndex >= 0 ? lines[lineIndex]! : label;
    if (!mentions.some((m) => m.label === label)) {
      mentions.push({
        label,
        excerpt: line.slice(0, 120),
        quote,
      });
    }
  }

  return mentions;
}

function extractPartner(text: string): UnderstandingField {
  const lower = text.toLowerCase();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const lineIndex = findLineIndex(lines, (l) => l.toLowerCase().includes('양조장'));

  if (!lower.includes('양조장') && !PARTNER_KEYWORDS.some((k) => lower.includes(k.toLowerCase()))) {
    return toField(null, 'unknown', {
      missingLine: '문서에서 제휴 파트너 관련 표현을 확인하지 못했습니다.',
    });
  }

  const line = lineIndex >= 0 ? lines[lineIndex]! : '';
  if (lower.includes('양조장')) {
    return toField('전국 양조장 (제휴 파트너 · B2B Revenue Source)', 'document', {
      excerpt: line.slice(0, 120) || '양조장 제휴',
      pageRef: lineIndex >= 0 ? lineToPageRef(lineIndex) : null,
      confirmedExpressions: ['전국 양조장 제휴'],
    });
  }
  return toField(null, 'unknown', {
    missingLine: '문서에서 제휴 파트너 관련 표현을 확인하지 못했습니다.',
  });
}

function extractRevenue(text: string): UnderstandingField {
  const lower = text.toLowerCase();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const parts: string[] = [];
  if (lower.includes('양조장') && lower.includes('제휴')) parts.push('양조장 제휴');
  if (lower.includes('데이터') && lower.includes('리포트')) parts.push('데이터 리포트');

  if (parts.length === 0 && REVENUE_KEYWORDS.some((k) => lower.includes(k.toLowerCase()))) {
    const lineIndex = findLineIndex(lines, (l) =>
      REVENUE_KEYWORDS.some((k) => l.toLowerCase().includes(k.toLowerCase())),
    );
    const line = lineIndex >= 0 ? lines[lineIndex]! : '';
    if (line) {
      const expression = line.slice(0, 40).trim();
      return toField(line.slice(0, 80), 'document', {
        excerpt: line.slice(0, 120),
        pageRef: lineToPageRef(lineIndex),
        confirmedExpressions: [expression],
      });
    }
  }

  if (parts.length > 0) {
    const lineIndex = findLineIndex(lines, (l) =>
      ['제휴', '수익', '리포트'].some((k) => l.toLowerCase().includes(k)),
    );
    return toField(parts.join(' · '), 'document', {
      excerpt: parts.join(', '),
      pageRef: lineIndex >= 0 ? lineToPageRef(lineIndex) : null,
      confirmedExpressions: parts,
    });
  }

  return toField(null, 'unknown', {
    missingLine: '문서에서 수익 모델 관련 표현을 확인하지 못했습니다.',
  });
}

function extractFounderField(text: string, entities: LaunchLensDomainContext): UnderstandingField {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const lower = line.toLowerCase();
    if (['타겟', '고객', 'customer', '양조장', 'mz', 'fit'].some((k) => lower.includes(k))) {
      continue;
    }
    if (lower.includes('관광') && (lower.includes('창업') || lower.includes('벤처'))) {
      return toField('관광벤처 예비창업자', 'document', {
        excerpt: line.slice(0, 120),
        pageRef: lineToPageRef(i),
        confirmedExpressions: ['관광벤처 예비창업자'],
      });
    }
  }

  if (entities.founder.basis === 'document' && entities.founder.value) {
    const expression =
      isFounderArchetypeOnly(entities.founder.value) && text.toLowerCase().includes('관광')
        ? '관광벤처 예비창업자'
        : entities.founder.value;
    return toField(expression, 'document', {
      excerpt: entities.founder.excerpt,
      confirmedExpressions: [expression],
    });
  }

  return toField(null, 'unknown', {
    missingLine: '문서에서 창업자·대표 관련 표현을 확인하지 못했습니다.',
  });
}

function isFounderArchetypeOnly(value: string): boolean {
  return ['예비창업자', '예비 창업자', '창업자', '대표'].includes(value.trim());
}

function extractBusinessField(text: string, entities: LaunchLensDomainContext): UnderstandingField {
  const lower = text.toLowerCase();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const expressions: string[] = [];

  if (lower.includes('전통주') && (lower.includes('관광') || lower.includes('플랫폼'))) {
    const lineIndex = findLineIndex(lines, (l) => {
      const ll = l.toLowerCase();
      return ll.includes('전통주') && (ll.includes('관광') || ll.includes('플랫폼'));
    });
    expressions.push('AI 기반 전통주 관광 플랫폼');
    if (entities.business.model) expressions.push(entities.business.model);
    const modelSuffix = entities.business.model ? ` · ${entities.business.model}` : '';
    return toField(`AI 기반 전통주 관광 플랫폼${modelSuffix}`, 'document', {
      excerpt: 'AI 기반 전통주 관광 플랫폼',
      pageRef: lineIndex >= 0 ? lineToPageRef(lineIndex) : null,
      confirmedExpressions: expressions,
    });
  }

  const name = entities.business.name ?? entities.business.value;
  if (name) {
    const lineIndex = findLineIndex(lines, (l) => l.includes(name.slice(0, Math.min(8, name.length))));
    expressions.push(name);
    if (entities.business.model) expressions.push(entities.business.model);
    const modelSuffix = entities.business.model ? ` · ${entities.business.model}` : '';
    return toField(`${name}${modelSuffix}`, entities.business.basis === 'document' ? 'document' : 'unknown', {
      excerpt: entities.business.excerpt,
      pageRef: lineIndex >= 0 ? lineToPageRef(lineIndex) : null,
      confirmedExpressions: entities.business.basis === 'document' ? expressions : null,
      missingLine:
        entities.business.basis === 'document' ? null : '문서에서 사업·서비스 설명을 확인하지 못했습니다.',
    });
  }

  return toField(null, 'unknown', {
    missingLine: '문서에서 사업·서비스 설명을 확인하지 못했습니다.',
  });
}

function extractValueProposition(business: UnderstandingField): UnderstandingField {
  if (!business.value) {
    return toField(null, 'unknown', {
      missingLine: '문서에서 가치 제안을 확인하지 못했습니다.',
    });
  }
  const stripped = business.value.replace(/\s*·\s*B2C|\s*·\s*B2B/gi, '').trim();
  return toField(stripped, business.status, {
    excerpt: business.excerpt,
    pageRef: business.pageRef,
    confirmedExpressions: stripped !== business.value ? [stripped] : business.confirmedExpressions,
  });
}

function mapCustomerField(
  entities: LaunchLensDomainContext,
  mentions: CustomerMention[],
): UnderstandingField {
  const quotes = mentions.map((m) => m.quote);
  const withholdMeta = {
    confirmedExpressions: quotes.length > 0 ? quotes : null,
    missingLine: quotes.length > 0 ? CUSTOMER_MISSING_LINE : CUSTOMER_MISSING_NO_SECTION,
    nextStep: CUSTOMER_NEXT_STEP,
  };

  if (mentions.length >= 2) {
    return toField(null, 'needs_confirmation', {
      excerpt: mentions[0]?.excerpt ?? null,
      ...withholdMeta,
    });
  }
  if (
    entities.customer.basis === 'document' &&
    entities.customer.value &&
    !isFounderArchetypeOnly(entities.customer.value)
  ) {
    return toField(entities.customer.value, 'document', {
      excerpt: entities.customer.excerpt,
      confirmedExpressions: [entities.customer.value],
    });
  }
  if (mentions.length > 0 || entities.customer.basis === 'needs_confirmation') {
    return toField(null, 'needs_confirmation', {
      excerpt: mentions[0]?.excerpt ?? entities.customer.excerpt,
      ...withholdMeta,
    });
  }
  return toField(null, 'unknown', withholdMeta);
}

function extractProblem(text: string): UnderstandingField {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const lineIndex = findLineIndex(lines, (l) => /문제|problem|pain|과제/i.test(l));
  if (lineIndex >= 0 && lines[lineIndex]!.length > 4) {
    const line = lines[lineIndex]!;
    const expression = line.slice(0, 60).trim();
    return toField(line.slice(0, 80), 'document', {
      excerpt: line.slice(0, 120),
      pageRef: lineToPageRef(lineIndex),
      confirmedExpressions: [expression],
    });
  }
  return toField(null, 'unknown');
}

export function buildBusinessUnderstanding(raw: string): BusinessUnderstanding {
  const text = raw.trim();
  const entities = extractDocumentEntities(text);
  const customerMentions = extractCustomerMentions(text);
  const business = extractBusinessField(text, entities);
  const valueProposition = extractValueProposition(business);

  return {
    founder: extractFounderField(text, entities),
    business,
    valueProposition,
    customer: mapCustomerField(entities, customerMentions),
    customerMentions,
    revenue: extractRevenue(text),
    partner: extractPartner(text),
    problem: extractProblem(text),
    solution:
      entities.product.basis === 'document' && entities.product.value
        ? toField(entities.product.value, 'document', {
            excerpt: entities.product.excerpt,
            confirmedExpressions: [entities.product.value.slice(0, 60)],
          })
        : toField(null, 'unknown'),
  };
}

export const TASTE_COMPANY_FULL_SAMPLE = `취향저격컴퍼니
관광벤처 예비창업자
AI/MCP 기반 플랫폼 경험
AI 기반 전통주 관광 플랫폼
B2C
동시에 양조장 대상 B2B 수익모델
타겟: MZ세대 · FIT 관광객 · 방한 외국인 · 전통주 관심 소비자
양조장 제휴 및 데이터 리포트 수익`;

export function buildBusinessUnderstandingIntro(): string {
  return '검토 전에 사업 이해를 함께 확인하겠습니다.';
}

export function buildReviewTransitionMessage(): string {
  return '대표님이 확인한 내용을 기준으로 사업성을 검토하겠습니다.';
}
