import { describe, expect, it } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildAiPmRuntimeJudgment } from '../build-workspace-ai-pm-state';
import { buildAiPmDynamicDiagnosis } from '../build-ai-pm-dynamic-diagnosis';
import { extractDocumentEntities } from '../../domain/extract-document-entities';
import { mergeWorkspacePersistedContext } from '@/lib/project/workspace-persisted-state';

const DEMO_DOC = `스마트팩토리 예지보전 SaaS
창업자: 김대표
사업: 30인 이하 제조기업 대상 설비 고장 예측
문제: 예기치 않은 설비 고장으로 생산 중단
시장: 국내 3만 개 중소 제조 공장 · 예지보전 SW 침투율 8%
BM: 월 49만 원 구독 · 공장당 10대 센서 포함`;

describe('Sprint P1-4 — demo workspace continuity', () => {
  it('mergeWorkspacePersistedContext preserves loop + document for promotion', () => {
    const snapshot = {
      documentText: DEMO_DOC,
      aiPmLoop: {
        version: 1 as const,
        phase: 'issue' as const,
        turns: [
          {
            issueId: 'customer_definition' as const,
            answer: '설비 관리자 / 공장장',
            appliedAt: '2026-08-01T00:00:00.000Z',
          },
        ],
        currentIssueId: 'problem_definition' as const,
        readingCompleted: true,
        dismissedReadAck: true,
      },
      understandingPhase: 'aligning' as const,
      reviewCount: 0,
      updatedAt: '2026-08-01T00:00:00.000Z',
    };

    const merged = mergeWorkspacePersistedContext({}, snapshot);
    const v2Workspace = (merged as { v2Workspace: typeof snapshot }).v2Workspace;

    expect(v2Workspace.documentText).toContain('예지보전');
    expect(v2Workspace.aiPmLoop?.turns).toHaveLength(1);
    expect(v2Workspace.aiPmLoop?.readingCompleted).toBe(true);
  });

  it('resume briefing continues from last completed issue after restore', () => {
    const understanding = buildBusinessUnderstanding(DEMO_DOC);
    const diagnosis = buildAiPmDynamicDiagnosis(
      understanding,
      extractDocumentEntities(DEMO_DOC),
      DEMO_DOC,
    );

    const judgment = buildAiPmRuntimeJudgment({
      documentText: DEMO_DOC,
      understanding,
      loop: {
        version: 1,
        phase: 'issue',
        turns: [
          {
            issueId: 'customer_definition',
            answer: '30인 이하 제조기업 설비 관리자',
            appliedAt: '2026-08-01T00:00:00.000Z',
          },
        ],
        currentIssueId: diagnosis.primaryIssueId,
        readingCompleted: true,
        dismissedReadAck: true,
      },
    });

    expect(judgment?.returnWelcome?.greeting).toBe('안녕하세요.');
    expect(judgment?.returnWelcome?.partnerInvite).toContain('같이 확인해 볼까요?');
    expect(judgment?.returnWelcome?.recapLead).toContain('구매자');
    expect(judgment?.resumeBriefing).toContain('안녕하세요.');
    expect(judgment?.businessClarity?.currentSummary).toContain('예지보전');
  });
});
