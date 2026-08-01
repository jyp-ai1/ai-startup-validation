import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import {
  inferDomainFromPaste,
  loadWorkspaceDocumentText,
  saveWorkspaceDocumentText,
} from '../workspace-ai-pm-messages';

const ISSUE_SECTION_LABEL: Record<AiPmLoopIssueId, string> = {
  customer_definition: '고객 정의',
  problem_definition: '문제 정의',
  bm_design: '수익 모델',
  competitor_analysis: '경쟁사',
  market_validation: '시장 검증',
};

/** Merge founder answer into working document and re-infer domain entities. */
export function applyAiPmLoopAnswer(
  issueId: AiPmLoopIssueId,
  answer: string,
  projectId?: string,
): ReturnType<typeof inferDomainFromPaste> {
  const trimmed = answer.trim();
  const existing = loadWorkspaceDocumentText(projectId)?.trim() ?? '';
  const section = ISSUE_SECTION_LABEL[issueId];
  const block = `\n\n[AI PM 확인 · ${section}]\n${trimmed}`;
  const nextDocument = existing ? `${existing}${block}` : trimmed;
  saveWorkspaceDocumentText(nextDocument, projectId);
  return inferDomainFromPaste(nextDocument, projectId);
}
