import type {
  DomainTrustIssue,
  DomainTrustReport,
  LaunchLensDomainContext,
} from '@repo/types/domain/launchlens-domain';

function founderMatchesCustomer(
  founder: LaunchLensDomainContext['founder'],
  customer: LaunchLensDomainContext['customer'],
): boolean {
  if (!founder.value || !customer.value) return false;
  const f = founder.value.toLowerCase();
  const c = customer.value.toLowerCase();
  return f === c || c.includes(f) || f.includes(c);
}

/** P0 — AI PM must not treat founder as customer (especially B2C). */
export function evaluateDomainTrust(entities: LaunchLensDomainContext): DomainTrustReport {
  const issues: DomainTrustIssue[] = [];

  if (founderMatchesCustomer(entities.founder, entities.customer)) {
    issues.push('founder_equals_customer');
  }

  if (entities.business.model === 'B2C' && !entities.customer.value) {
    issues.push('customer_missing_b2c');
  }

  if (!entities.business.model) {
    issues.push('business_model_unknown');
  }

  if (
    entities.customer.basis === 'inferred' &&
    !entities.customer.value
  ) {
    issues.push('customer_inferred_without_basis');
  }

  if (entities.customer.basis === 'needs_confirmation') {
    issues.push('customer_missing_b2c');
  }

  const mustConfirmCustomer =
    issues.includes('founder_equals_customer') ||
    issues.includes('customer_missing_b2c') ||
    entities.customer.basis === 'needs_confirmation';

  return {
    ok: issues.length === 0,
    issues,
    mustConfirmCustomer,
  };
}
