import { analyzeSmartIntakeDocument } from '../v2-smart-intake-engine';
import { extractDocumentEntities } from '../domain/extract-document-entities';
import { buildFirstTrustMessage } from './build-first-trust-message';
import { lintFirstTrustCopy, lintParagraphStructure } from './first-trust-lint';

export { lintFirstTrustCopy, lintParagraphStructure, assertFirstTrustCopy } from './first-trust-lint';
export { buildFirstTrustMessage } from './build-first-trust-message';
export { ZERO_LIE_PHRASES, SPECULATIVE_PATTERNS } from './zero-lie-corpus';

/** 취향저격컴퍼니 sample — full document with customer line */
export const TASTE_COMPANY_SAMPLE = `취향저격컴퍼니
예비창업자 대표
B2C
타겟 고객: 일반인 (외국인 포함)`;

export const PDF_PLACEHOLDER_TEXT = `# 취향저격컴퍼니.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

export function buildTasteCompanyFirstMessage() {
  const entities = extractDocumentEntities(TASTE_COMPANY_SAMPLE);
  const domain = {
    founder: entities.founder.value ?? '',
    business: entities.business.name ?? '취향저격컴퍼니',
    customer: entities.customer.value ?? '',
    market: '',
    competitor: '',
  };
  return buildFirstTrustMessage(domain, 0, entities, { customerConfirmed: true });
}

export function buildPdfPlaceholderFirstMessage() {
  const analysis = analyzeSmartIntakeDocument(PDF_PLACEHOLDER_TEXT, 'pdf');
  const domain = {
    founder: '예비창업자',
    business: analysis.serviceName || '취향저격컴퍼니',
    customer: '',
    market: '',
    competitor: '',
  };
  return buildFirstTrustMessage(domain, 0, analysis.entities, { customerConfirmed: false });
}

export function buildB2cFounderConfusionMessage() {
  const entities = extractDocumentEntities(`취향저격컴퍼니
B2C
예비창업자`);
  const domain = {
    founder: entities.founder.value ?? '예비창업자',
    business: '취향저격컴퍼니',
    customer: '',
    market: '',
    competitor: '',
  };
  return buildFirstTrustMessage(domain, 0, entities, { customerConfirmed: false });
}

export function copyFromMessage(message: { paragraphs: string[]; ordA?: Record<string, string> }) {
  const ordA = message.ordA ? Object.values(message.ordA).join('\n') : '';
  return [...message.paragraphs, ordA].filter(Boolean).join('\n');
}

export function expectFirstTrustPass(text: string) {
  const lint = lintFirstTrustCopy(text);
  if (!lint.ok) {
    throw new Error(lint.violations.join('; '));
  }
}
