import type { BusinessUnderstanding, UnderstandingField } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

export type DiscoveryItemStatus = 'confirmed' | 'partial' | 'unknown';

export type DiscoveryItem = {
  id: string;
  labelKey: string;
  status: DiscoveryItemStatus;
  detail?: string | null;
};

function entityFieldToStatus(
  value: string | null | undefined,
  basis: LaunchLensDomainContext['market']['basis'],
): DiscoveryItemStatus {
  if (basis === 'document' && value?.trim()) return 'confirmed';
  if (basis === 'needs_confirmation') return 'partial';
  return 'unknown';
}

function fieldToStatus(field: UnderstandingField): DiscoveryItemStatus {
  if (field.status === 'document' && (field.value?.trim() || field.confirmedExpressions?.length)) {
    return 'confirmed';
  }
  if (field.status === 'needs_confirmation' || (field.confirmedExpressions?.length && !field.value)) {
    return 'partial';
  }
  return 'unknown';
}

function fieldDetail(field: UnderstandingField): string | null {
  if (field.value?.trim()) return field.value.trim();
  if (field.confirmedExpressions?.length) {
    return field.confirmedExpressions.join(' · ');
  }
  return field.missingLine ?? null;
}

export function buildDiscoveryItems(
  understanding: BusinessUnderstanding,
  entities?: LaunchLensDomainContext | null,
): DiscoveryItem[] {
  const customerDetail =
    understanding.customerMentions.length > 0
      ? understanding.customerMentions.map((m) => m.label).join(' · ')
      : fieldDetail(understanding.customer);

  return [
    {
      id: 'founder',
      labelKey: 'discovery.founder',
      status: fieldToStatus(understanding.founder),
      detail: fieldDetail(understanding.founder),
    },
    {
      id: 'business',
      labelKey: 'discovery.business',
      status: fieldToStatus(understanding.business),
      detail: fieldDetail(understanding.business),
    },
    {
      id: 'customer',
      labelKey: 'discovery.customerCandidates',
      status:
        understanding.customerMentions.length >= 2 || understanding.customer.status === 'needs_confirmation'
          ? 'partial'
          : fieldToStatus(understanding.customer),
      detail: customerDetail,
    },
    {
      id: 'market',
      labelKey: 'discovery.market',
      status: entityFieldToStatus(entities?.market.value, entities?.market.basis ?? 'unknown'),
      detail: entities?.market.value ?? understanding.problem.value,
    },
    {
      id: 'competitor',
      labelKey: 'discovery.competitor',
      status: entityFieldToStatus(entities?.competitor.value, entities?.competitor.basis ?? 'unknown'),
      detail: entities?.competitor.value,
    },
  ];
}

export function collectUnconfirmedLines(
  understanding: BusinessUnderstanding,
  entities?: LaunchLensDomainContext | null,
): string[] {
  const lines: string[] = [];

  const pushIfUnknown = (field: UnderstandingField) => {
    if (field.status === 'unknown' && field.missingLine) {
      lines.push(field.missingLine);
    }
  };

  pushIfUnknown(understanding.founder);
  pushIfUnknown(understanding.business);
  if (understanding.customer.status !== 'document' && understanding.customer.missingLine) {
    lines.push(understanding.customer.missingLine);
  }
  pushIfUnknown(understanding.revenue);
  pushIfUnknown(understanding.partner);

  if (entities?.market.basis === 'unknown' && entities.market.value === null) {
    lines.push('시장 규모·범위는 문서만으로는 아직 확인하지 못했습니다.');
  }
  if (entities?.competitor.basis === 'unknown' && entities.competitor.value === null) {
    lines.push('경쟁사·대안은 문서만으로는 아직 확인하지 못했습니다.');
  }

  return [...new Set(lines)];
}
