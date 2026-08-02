import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { extractDocumentEntities } from '../domain/extract-document-entities';
import { isWorkspaceDocumentReadable } from './workspace-document-eligibility';
import { buildAiPmSharedMemory } from './build-ai-pm-shared-memory';
import {
  buildPartnerNextStep,
  buildPartnerReturnInvite,
  type AiPmPartnerNext,
} from './build-ai-pm-partner-voice';
import type { AiPmLoopIssueId, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** S4 — how the business became clearer (not document delta). */
export type AiPmBusinessClarity = {
  lead: string;
  initialSummary: string;
  currentSummary: string;
  evolutionLead: string;
};

/** S6 — one evolving business field shown in workspace header. */
export type BusinessEvolutionField = {
  label: string;
  value: string;
};

/** S6 — Business Snapshot for header + evidence (Turn 0 / 3 / 6). */
export type BusinessEvolutionSnapshot = {
  product: string | null;
  fields: BusinessEvolutionField[];
  turnCount: number;
};

/** Workspace-wide business state — single source of truth for header + loop. */
export type WorkspaceBusinessState = {
  label: string;
  headlineLines: string[];
  headline: string;
  snapshot: BusinessEvolutionSnapshot;
  partnerNext: AiPmPartnerNext | null;
  clarity: AiPmBusinessClarity | null;
};

export type AiPmReturnWelcome = {
  greeting: string;
  recapLead: string;
  clarityLead: string;
  businessClarity: AiPmBusinessClarity;
  partnerInvite: string;
};

const TODAY_FOCUS: Record<AiPmLoopIssueId, string> = {
  customer_definition: '누가 실제 고객인지를 같이 보겠습니다.',
  problem_definition: '대표가 왜 비용을 낼 만큼 불편한지를 같이 보겠습니다.',
  bm_design: '누가 얼마를 내는지를 같이 보겠습니다.',
  competitor_analysis: '고객이 지금 무엇을 대신 쓰는지를 같이 보겠습니다.',
  market_validation: '왜 지금 이 시장인지를 같이 보겠습니다.',
};

/** @deprecated S5 — use buildPartnerNextStep */
const TODAY_FOCUS_SHORT: Record<AiPmLoopIssueId, string> = {
  customer_definition: '누가 실제 고객인지',
  problem_definition: '대표가 왜 비용을 낼 만큼 불편한지',
  bm_design: '누가 얼마를 내는지',
  competitor_analysis: '고객이 지금 무엇을 대신 쓰는지',
  market_validation: '왜 지금 이 시장인지',
};

function truncate(text: string, max = 56): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function extractProductPhrase(documentText: string, entities: LaunchLensDomainContext | null): string | null {
  const fromEntity = entities?.product.value?.trim() || entities?.business.name?.trim();
  if (fromEntity && fromEntity.length >= 2) return truncate(fromEntity, 40);

  const solutionMatch = documentText.match(
    /(?:솔루션|서비스|제품|사업)[:\s]*([^\n#]{4,48})/i,
  );
  if (solutionMatch?.[1]) return truncate(solutionMatch[1], 40);

  const saasMatch = documentText.match(/([^\n]{2,32}(?:SaaS|saas))/);
  if (saasMatch?.[1]) return truncate(saasMatch[1], 40);

  return null;
}

function extractInitialBusinessSummary(
  understanding: BusinessUnderstanding,
  documentText: string,
): string {
  if (understanding.customerMentions.length >= 2) {
    return understanding.customerMentions
      .slice(0, 3)
      .map((mention) => mention.label)
      .join(' · ');
  }

  if (understanding.customer.value?.trim()) {
    return truncate(understanding.customer.value, 36);
  }

  if (/중소|제조|기업|스타트업|공장/i.test(documentText)) {
    return '중소기업 대상';
  }

  const firstLine = documentText
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find((line) => line.length >= 4);

  return firstLine ? truncate(firstLine, 36) : '사업 초안';
}

function normalizeRolePhrase(text: string): string {
  return text.replace(/(?:입니다|이에요|예요|입니다\.)\s*$/u, '').trim();
}

function extractUserRole(answer: string): string | null {
  const userMatch = answer.match(/사용자(?:는|가)?\s*([^,.。\n]{1,16})/);
  if (userMatch?.[1]) return truncate(normalizeRolePhrase(userMatch[1]), 16);
  if (/공장장/i.test(answer)) return '공장장';
  if (/설비\s*관리|관리자/i.test(answer)) return '설비 관리자';
  if (/실무|담당|팀장|사용자/i.test(answer)) return '실무 사용자';
  if (/\/|·/.test(answer)) {
    const segment = answer.split(/\/|·/)[0]?.trim();
    if (segment && /관리|공장|실무|담당/i.test(segment)) return truncate(segment, 16);
  }
  return null;
}

function extractPayerRole(answer: string): string | null {
  const payerMatch = answer.match(/구매자(?:는|가)?\s*([^,.。\n]{1,16})/);
  if (payerMatch?.[1]) return truncate(normalizeRolePhrase(payerMatch[1]), 16);
  if (/대표|CEO|ceo/i.test(answer)) return '대표';
  if (/결제|구매/i.test(answer) && !/구매자는/i.test(answer)) {
    return truncate(answer, 16);
  }
  return null;
}

function subjectParticle(noun: string): string {
  const lastChar = noun.charCodeAt(noun.length - 1);
  const hasBatchim = (lastChar - 0xac00) % 28 !== 0;
  return hasBatchim ? `${noun}이` : `${noun}가`;
}

function extractCustomerSegment(
  answer: string,
  documentText: string,
  understanding: BusinessUnderstanding,
): string {
  const segmentMatch = answer.match(/(\d+인\s*이하\s*[^\s,.。]{2,20})/);
  if (segmentMatch?.[1]) return truncate(segmentMatch[1], 40);

  const cleaned = answer
    .replace(/구매자(?:는|가)?[^,.。]*/gi, '')
    .replace(/사용자(?:는|가)?[^,.。]*/gi, '')
    .replace(/payer|buyer|user/gi, '')
    .replace(/[·/]/g, ' ')
    .trim();

  if (cleaned.length >= 4 && !/^대표|공장장|관리자/.test(cleaned)) {
    return truncate(cleaned, 40);
  }

  return extractInitialBusinessSummary(understanding, documentText);
}

function extractValueFromDocument(documentText: string): string | null {
  const solutionMatch = documentText.match(
    /(?:솔루션|가치|value)[:\s]*([^\n#]{4,48})/i,
  );
  if (solutionMatch?.[1]) return truncate(solutionMatch[1], 40);
  return null;
}

/** S6 — progressive business snapshot from document + completed turns. */
export function buildBusinessEvolutionSnapshot(input: {
  documentText: string;
  turns: AiPmLoopTurn[];
  understanding: BusinessUnderstanding;
  entities?: LaunchLensDomainContext | null;
}): BusinessEvolutionSnapshot {
  const text = input.documentText.trim();
  const entities = input.entities ?? extractDocumentEntities(text);
  const product = extractProductPhrase(text, entities);
  const fields: BusinessEvolutionField[] = [];

  const customerTurn = input.turns.find((turn) => turn.issueId === 'customer_definition');
  const problemTurn = input.turns.find((turn) => turn.issueId === 'problem_definition');
  const bmTurn = input.turns.find((turn) => turn.issueId === 'bm_design');
  const competitorTurn = input.turns.find((turn) => turn.issueId === 'competitor_analysis');
  const marketTurn = input.turns.find((turn) => turn.issueId === 'market_validation');

  if (customerTurn) {
    fields.push({
      label: '고객',
      value: extractCustomerSegment(customerTurn.answer, text, input.understanding),
    });
    const userRole = extractUserRole(customerTurn.answer);
    if (userRole) fields.push({ label: '사용자', value: userRole });
    const payerRole = extractPayerRole(customerTurn.answer);
    if (payerRole) fields.push({ label: '구매자', value: payerRole });
  } else {
    const initialCustomer = extractInitialBusinessSummary(input.understanding, text);
    if (initialCustomer) fields.push({ label: '고객', value: initialCustomer });
  }

  if (problemTurn) {
    fields.push({ label: '문제', value: truncate(problemTurn.answer, 48) });
  }

  const valueFromDoc = extractValueFromDocument(text);
  if (bmTurn) {
    fields.push({ label: '가치제안', value: truncate(bmTurn.answer, 48) });
  } else if (valueFromDoc && input.turns.length >= 2) {
    fields.push({ label: '가치제안', value: valueFromDoc });
  }

  if (competitorTurn) {
    fields.push({ label: '대체재', value: truncate(competitorTurn.answer, 48) });
  }

  if (marketTurn) {
    fields.push({ label: '시장', value: truncate(marketTurn.answer, 48) });
  }

  return {
    product,
    fields,
    turnCount: input.turns.length,
  };
}

/** Plain-text snapshot for Turn 0 / 3 / 6 evidence comparison. */
export function formatBusinessSnapshotEvidence(snapshot: BusinessEvolutionSnapshot): string {
  const lines: string[] = ['현재 사업'];
  if (snapshot.product) lines.push(snapshot.product);
  lines.push('──────────────');
  for (const field of snapshot.fields) {
    lines.push(field.label, field.value);
  }
  return lines.join('\n');
}

function buildBusinessHeadlineLines(
  turns: AiPmLoopTurn[],
  documentText: string,
  entities: LaunchLensDomainContext | null,
  understanding: BusinessUnderstanding,
): string[] {
  const lines: string[] = [];
  const customerTurn = turns.find((turn) => turn.issueId === 'customer_definition');

  if (customerTurn) {
    const userRole = extractUserRole(customerTurn.answer);
    const payerRole = extractPayerRole(customerTurn.answer);
    if (userRole) lines.push(`${subjectParticle(userRole)} 사용하는`);
    if (payerRole) lines.push(`${subjectParticle(payerRole)} 비용을 내는`);
  }

  const product = extractProductPhrase(documentText, entities);
  if (product) lines.push(product);

  const problemTurn = turns.find((turn) => turn.issueId === 'problem_definition');
  if (problemTurn && lines.length > 0) {
    lines.push(truncate(problemTurn.answer, 36));
  }

  if (lines.length > 0) return lines;

  const draft = extractInitialBusinessSummary(understanding, documentText);
  if (product && draft !== product) return [draft, product];
  return [draft];
}

/** @deprecated S5 — use buildPartnerNextStep */
function buildTodayFocusLine(nextIssueId: AiPmLoopIssueId | null): string | null {
  if (!nextIssueId) return null;
  return `우리는 ${TODAY_FOCUS_SHORT[nextIssueId]} 확인합니다.`;
}

function buildCurrentBusinessSummary(
  turns: AiPmLoopTurn[],
  documentText: string,
  entities: LaunchLensDomainContext | null,
  understanding: BusinessUnderstanding,
): string {
  const lines = buildBusinessHeadlineLines(turns, documentText, entities, understanding);
  return lines.join(' · ');
}

function koreanObjectParticle(noun: string): string {
  const lastChar = noun.charCodeAt(noun.length - 1);
  const hasBatchim = (lastChar - 0xac00) % 28 !== 0;
  return hasBatchim ? `${noun}을` : `${noun}를`;
}

function buildRecapLead(turns: AiPmLoopTurn[]): string {
  const memory = buildAiPmSharedMemory(turns, null);
  if (!memory || memory.items.length === 0) {
    return '우리가 지금까지 사업을 같이 정리했습니다.';
  }

  const labels = memory.items.map((item) => item.label);
  if (labels.length === 1) {
    return `우리가 지금까지 ${koreanObjectParticle(labels[0]!)} 정리했습니다.`;
  }

  const joined =
    labels.length === 2
      ? `${labels[0]}과 ${labels[1]}`
      : `${labels.slice(0, -1).join(', ')}과 ${labels.at(-1)}`;

  return `우리가 지금까지 ${koreanObjectParticle(joined)} 정리했습니다.`;
}

/** Build business evolution snapshot from document + completed turns. */
export function buildAiPmBusinessClarity(input: {
  documentText: string;
  turns: AiPmLoopTurn[];
  understanding: BusinessUnderstanding;
  entities?: LaunchLensDomainContext | null;
}): AiPmBusinessClarity | null {
  const text = input.documentText.trim();
  if (text.length < 8 || input.turns.length === 0) return null;

  const entities = input.entities ?? extractDocumentEntities(text);
  const initialSummary = extractInitialBusinessSummary(input.understanding, text);
  const currentSummary = buildCurrentBusinessSummary(
    input.turns,
    text,
    entities,
    input.understanding,
  );

  if (initialSummary === currentSummary) {
    return {
      lead: '우리가 지금까지 정리했습니다.',
      initialSummary,
      currentSummary,
      evolutionLead: `이제 사업은 "${currentSummary}"까지는 명확해졌습니다.`,
    };
  }

  return {
    lead: '우리가 지금까지 정리했습니다.',
    initialSummary,
    currentSummary,
    evolutionLead: `이제 사업은 "${currentSummary}"까지는 명확해졌습니다.`,
  };
}

/** S4 return visit — thought continuity, not login continuity. */
export function buildAiPmReturnWelcome(input: {
  documentText: string;
  turns: AiPmLoopTurn[];
  understanding: BusinessUnderstanding;
  nextIssueId: AiPmLoopIssueId | null;
  entities?: LaunchLensDomainContext | null;
}): AiPmReturnWelcome | null {
  const clarity = buildAiPmBusinessClarity(input);
  if (!clarity || !input.nextIssueId) return null;

  return {
    greeting: '안녕하세요.',
    recapLead: buildRecapLead(input.turns),
    clarityLead: '그래서 사업은 여기까지 선명해졌습니다.',
    businessClarity: clarity,
    partnerInvite: buildPartnerReturnInvite(input.nextIssueId),
  };
}

export function formatReturnWelcomeProse(welcome: AiPmReturnWelcome): string {
  return [
    welcome.greeting,
    welcome.recapLead,
    welcome.clarityLead,
    `"${welcome.businessClarity.currentSummary}"`,
    welcome.partnerInvite,
  ].join('\n');
}

/** Workspace central state — drives header, loop, and return welcome. */
export function buildWorkspaceBusinessState(input: {
  documentText: string;
  turns: AiPmLoopTurn[];
  understanding: BusinessUnderstanding;
  nextIssueId?: AiPmLoopIssueId | null;
  entities?: LaunchLensDomainContext | null;
}): WorkspaceBusinessState | null {
  const text = input.documentText.trim();
  if (text.length < 8) return null;

  const entities = input.entities ?? extractDocumentEntities(text);
  const headlineLines = buildBusinessHeadlineLines(
    input.turns,
    text,
    entities,
    input.understanding,
  );
  const headline = headlineLines.join(' · ');
  const snapshot = buildBusinessEvolutionSnapshot({
    documentText: text,
    turns: input.turns,
    understanding: input.understanding,
    entities,
  });
  const clarity =
    input.turns.length > 0
      ? buildAiPmBusinessClarity({
          documentText: text,
          turns: input.turns,
          understanding: input.understanding,
          entities,
        })
      : null;
  return {
    label: '현재 사업',
    headlineLines,
    headline,
    snapshot,
    partnerNext: buildPartnerNextStep(
      input.nextIssueId ?? null,
      input.turns.length,
      isWorkspaceDocumentReadable(text),
    ),
    clarity,
  };
}
