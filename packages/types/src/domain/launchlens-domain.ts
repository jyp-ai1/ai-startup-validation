/** How a domain field was derived — not AI confidence. */
export type EntityBasis = 'document' | 'inferred' | 'unknown' | 'needs_confirmation';

export type DomainEntityField<T = string> = {
  value: T | null;
  basis: EntityBasis;
  /** Source line or snippet from document — shown as evidence */
  excerpt?: string | null;
};

export type BusinessModel = 'B2B' | 'B2C' | 'B2G';

export type LaunchLensDomainContext = {
  founder: DomainEntityField;
  business: DomainEntityField & { model: BusinessModel | null; name?: string | null };
  customer: DomainEntityField;
  product: DomainEntityField;
  market: DomainEntityField;
  competitor: DomainEntityField;
};

export type DomainTrustIssue =
  | 'founder_equals_customer'
  | 'customer_missing_b2c'
  | 'business_model_unknown'
  | 'customer_inferred_without_basis';

export type DomainTrustReport = {
  ok: boolean;
  issues: DomainTrustIssue[];
  /** Block downstream review until user confirms customer */
  mustConfirmCustomer: boolean;
};
