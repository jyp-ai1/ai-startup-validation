/**
 * Meaning-preserving quantity units for Evidence / DCE matching.
 * Do not collapse 곳 → 건. Keep what is counted, then match the verb.
 */

export type QuantityKind = 'customer_org' | 'person' | 'transaction' | 'contract';

export type CountedQuantity = {
  count: number;
  unit: string;
  kind: QuantityKind;
  start: number;
  end: number;
};

const PAYMENT_VERB = /(결제했|지불했|유료로\s*(썼|사용|전환))/;
const COMPLETION_VERB = /(등록했|거래됐|거래가 됐|거래가 발생|재구매했|체결됐|실제로\s*재판매)/;
const COMMERCIAL_MARK = /(결제|지불|유료)/;

const ORG_NOUN = '병원|의원|클리닉|브랜드|업체|회사|가게|점포|매장|식당|카페';

const UNIT_SPECS: Array<{ pattern: RegExp; kind: QuantityKind }> = [
  { pattern: new RegExp(`(\\d+)\\s*개\\s*(${ORG_NOUN})`, 'g'), kind: 'customer_org' },
  { pattern: new RegExp(`(${ORG_NOUN})\\s*(\\d+)\\s*개`, 'g'), kind: 'customer_org' },
  { pattern: new RegExp(`(\\d+)\\s*(${ORG_NOUN})`, 'g'), kind: 'customer_org' },
  { pattern: /(\d+)\s*곳/g, kind: 'customer_org' },
  { pattern: /(\d+)\s*계약/g, kind: 'contract' },
  { pattern: /(\d+)\s*명/g, kind: 'person' },
  { pattern: /(\d+)\s*건/g, kind: 'transaction' },
];

function firstDigit(match: RegExpExecArray): number {
  const captured = match.slice(1).find((part) => part !== undefined && /^\d+$/.test(part));
  return captured ? Number(captured) : Number.NaN;
}

export function extractQuantities(text: string): CountedQuantity[] {
  const found: CountedQuantity[] = [];
  const claimed: Array<{ start: number; end: number }> = [];

  const overlaps = (start: number, end: number) =>
    claimed.some((span) => start < span.end && end > span.start);

  for (const spec of UNIT_SPECS) {
    spec.pattern.lastIndex = 0;
    let match = spec.pattern.exec(text);
    while (match) {
      const start = match.index;
      const end = start + match[0].length;
      const count = firstDigit(match);
      if (!Number.isNaN(count) && !overlaps(start, end)) {
        found.push({
          count,
          unit: match[0].replace(/^\d+\s*/, '').trim() || spec.kind,
          kind: spec.kind,
          start,
          end,
        });
        claimed.push({ start, end });
      }
      match = spec.pattern.exec(text);
    }
  }

  return found.sort((left, right) => left.start - right.start);
}

export function positiveQuantities(
  text: string,
  kinds?: readonly QuantityKind[],
): CountedQuantity[] {
  return extractQuantities(text).filter(
    (item) => item.count > 0 && (!kinds || kinds.includes(item.kind)),
  );
}

function isPersonUsageWithoutPayment(text: string, counted: CountedQuantity[]): boolean {
  const positive = counted.filter((item) => item.count > 0);
  if (positive.length === 0 || positive.some((item) => item.kind !== 'person')) return false;
  return /사용/.test(text) && !COMMERCIAL_MARK.test(text);
}

export function hasCountedPaidConversion(text: string): boolean {
  const counted = extractQuantities(text);
  if (!PAYMENT_VERB.test(text)) return false;
  if (isPersonUsageWithoutPayment(text, counted)) return false;
  return positiveQuantities(text, ['customer_org', 'person', 'transaction', 'contract']).length > 0;
}

export function hasCountedCompletion(text: string): boolean {
  const counted = extractQuantities(text);
  if (!COMPLETION_VERB.test(text)) return false;
  if (isPersonUsageWithoutPayment(text, counted)) return false;
  return positiveQuantities(text, ['person', 'transaction', 'contract']).length > 0;
}
