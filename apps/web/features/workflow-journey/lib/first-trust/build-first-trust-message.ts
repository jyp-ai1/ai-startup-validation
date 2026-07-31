import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import type { AiPmMessageBlock, WorkspaceDomainEvidence } from '../workspace-ai-pm-messages';

function modelQuote(entities: LaunchLensDomainContext): string | null {
  const model = entities.business.model;
  if (!model) return null;
  const excerpt = entities.business.excerpt?.trim();
  if (excerpt && excerpt.toUpperCase().includes(model)) return excerpt.slice(0, 80);
  return model;
}

function finalizeMessage(
  paragraphs: string[],
  ordA: AiPmMessageBlock['ordA'],
  blocked: boolean,
  activeField: AiPmMessageBlock['activeField'],
): AiPmMessageBlock {
  const filtered = paragraphs.filter((p) => p !== '');
  const nextAction = ordA?.nextAction ?? filtered[filtered.length - 1] ?? '';
  if (nextAction && filtered[filtered.length - 1] !== nextAction) {
    filtered.push(nextAction);
  }
  return {
    paragraphs: filtered,
    ordA,
    blocked,
    activeField,
  };
}

export function buildFirstTrustMessage(
  domain: WorkspaceDomainEvidence,
  reviewCount: number,
  entities?: LaunchLensDomainContext | null,
  options?: {
    customerConfirmed?: boolean;
  },
): AiPmMessageBlock {
  const hasBusiness = domain.business.trim().length >= 4;
  const hasFounder = domain.founder.trim().length >= 2;
  const customerConfirmed =
    options?.customerConfirmed ??
    Boolean(
      entities?.customer.basis === 'document' && (entities.customer.value?.trim().length ?? 0) >= 2,
    );

  if (!hasBusiness) {
    return finalizeMessage(
      ['대표님,', '아직 Business(사업/서비스)가 정리되지 않았습니다.', 'Business가 무엇인지 알려주세요.'],
      {
        observation: 'Business가 아직 없습니다.',
        reasoning: '근거 없이 Founder·Customer를 정리할 수 없습니다.',
        decision: 'Business부터 확인합니다.',
        nextAction: 'Business가 무엇인지 알려주세요.',
      },
      true,
      'business',
    );
  }

  if (!hasFounder) {
    return finalizeMessage(
      [
        '대표님,',
        `Business는 ${domain.business.trim()}로 확인했습니다.`,
        'Founder 정보를 알려주세요.',
      ],
      {
        observation: `Business: ${domain.business.trim()}`,
        reasoning: 'Founder는 문서 근거 없이 단정하지 않습니다.',
        decision: 'Founder 확인이 필요합니다.',
        nextAction: 'Founder 정보를 알려주세요.',
      },
      true,
      'founder',
    );
  }

  if (!customerConfirmed) {
    const model = entities?.business.model ?? null;
    const modelEvidence = entities ? modelQuote(entities) : null;
    const opening =
      model === 'B2C'
        ? '문서에서 B2C라는 표현은 확인했습니다.'
        : model === 'B2B'
          ? '문서에서 B2B라는 표현은 확인했습니다.'
          : entities?.business.basis === 'document'
            ? '문서에서 사업 유형에 대한 일부 내용은 확인했습니다.'
            : '아직 문서에서 확인할 수 있는 내용이 없습니다.';

    const body: string[] = ['대표님,', opening];
    if (modelEvidence && model) {
      body.push(`근거: "${modelEvidence}"`);
    }
    body.push('다만 실제 고객은 아직 확인하지 못했습니다.');
    body.push('다음으로 고객을 같이 정의하겠습니다.');

    return finalizeMessage(
      body,
      {
        observation: opening,
        reasoning: modelEvidence ? `근거: "${modelEvidence}"` : '문서에서 확인 가능한 항목 없음',
        decision: 'Customer는 추측하지 않습니다.',
        nextAction: '다음으로 고객을 같이 정의하겠습니다.',
      },
      true,
      'customer',
    );
  }

  if (reviewCount === 0 && entities) {
    const customerQuote = entities.customer.excerpt?.trim() ?? null;
    return finalizeMessage(
      [
        '대표님,',
        `Customer는 ${domain.customer.trim()}입니다.`,
        ...(customerQuote ? ['근거', `"${customerQuote}"`] : []),
        '다음으로 Market을 같이 정리하겠습니다.',
      ],
      {
        observation: `Customer: ${domain.customer.trim()}`,
        reasoning: customerQuote ? `근거: "${customerQuote}"` : '문서 기반',
        decision: 'Customer를 문서로 확인했습니다.',
        nextAction: '다음으로 Market을 같이 정리하겠습니다.',
      },
      false,
      null,
    );
  }

  return finalizeMessage(
    [
      '대표님,',
      domain.market.trim()
        ? `Market: ${domain.market.trim()}`
        : 'Market 정의가 아직 없습니다.',
      'Sidebar에서 Insight를 이어가겠습니다.',
    ],
    {
      observation: domain.market.trim() ? `Market: ${domain.market.trim()}` : 'Market 미정',
      reasoning: '문서에서 확인한 범위만 이어갑니다.',
      decision: '도메인 검토를 계속합니다.',
      nextAction: 'Sidebar에서 Insight를 이어가겠습니다.',
    },
    false,
    null,
  );
}
