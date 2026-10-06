import type { SiAxisId, SiEvidenceClass, SiEvidenceItem } from '@repo/types/domain/strategic-intelligence';

export function isFounderIntentOnly(answer: string): boolean {
  const text = answer.replace(/\s+/g, ' ').trim();
  return /(생각|의향|하려고|검토 중)/.test(text) && /(아직|아무도|없)/.test(text);
}

export function isFounderQuantifiedCompletion(answer: string): boolean {
  const text = answer.replace(/\s+/g, ' ').trim();
  if (isFounderIntentOnly(text)) return false;
  return (
    /\d+\s*(명|건)/.test(text) &&
    /(등록했|거래됐|거래가 됐|거래가 발생|재구매했|체결됐|실제로\s*재판매)/.test(text)
  );
}

export function isFounderQuantifiedPayment(answer: string): boolean {
  const text = answer.replace(/\s+/g, ' ').trim();
  if (isFounderIntentOnly(text) || isFounderQuantifiedCompletion(text)) return false;
  return /\d+\s*(명|건)/.test(text) && /(결제했|지불했|유료로\s*(썼|사용|전환))/.test(text);
}

export function classifyFounderEvidenceClass(answer: string): SiEvidenceClass {
  const text = answer.replace(/\s+/g, ' ').trim();
  if (!text) return 'ASSUMPTION';
  if (isFounderIntentOnly(text)) return 'CLAIM';
  if (isFounderQuantifiedCompletion(text) || isFounderQuantifiedPayment(text)) return 'VALIDATED';
  if (/(아직|확인되지|검증되지|없다|없음)/.test(text)) return 'ASSUMPTION';
  if (/(생각|의향|할 것이다|예정)/.test(text)) return 'CLAIM';
  return 'FACT';
}

export function classifyFounderEvidence(answer: string): SiEvidenceItem {
  const text = answer.replace(/\s+/g, ' ').trim();
  const evidenceClass = classifyFounderEvidenceClass(text);
  const axisId: SiAxisId =
    evidenceClass === 'VALIDATED' || /재판매|재구매|거래|등록/.test(text)
      ? 'validationStrength'
      : /결제|돈|유료/.test(text)
        ? 'businessModel'
        : 'customerProblemFit';
  return {
    id: 'founder-ev-1',
    text,
    evidenceClass,
    axisId,
  };
}
