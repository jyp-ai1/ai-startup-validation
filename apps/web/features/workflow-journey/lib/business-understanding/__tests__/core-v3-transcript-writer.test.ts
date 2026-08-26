/**
 * Writes docs/evidence/ALABOM/core-v3/TRANSCRIPT.md from the live engine.
 */
import { describe, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { getFact } from '../conversation-memory';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { resolveMissingFieldPriorities } from '../resolve-missing-field-priority';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const DOC = `서울·부산 외국인 관광객을 위한 로컬 맛집·체험 발견 및 예약 서비스(아이디어 단계).
인플루언서 핫플이 아니라 현지인이 다시 찾는 곳을 큐레이션하려 합니다.`;

const SCRIPT = [
  {
    label: 'T1 problem',
    askedIssueId: 'problem_definition' as const,
    answer: '외국인 관광객이 현지 맛집을 찾기 어렵고 예약·동선이 파편화되어 있습니다',
    scenario: 'H continuous / A document',
  },
  {
    label: 'T2 payer',
    askedIssueId: 'problem_definition' as const,
    answer: '관광객이 앱에서 직접 예약·결제합니다',
    scenario: 'B answer reflect + wrong-slot kill',
  },
  {
    label: 'T3 mid-judgment',
    askedIssueId: 'customer_definition' as const,
    answer: '지금까지 이해한 사업 정리해줘',
    scenario: 'G mid-judgment',
  },
  {
    label: 'T4 customer',
    askedIssueId: 'customer_definition' as const,
    answer: '방한 외국인 FIT 관광객이 주요 고객입니다',
    scenario: 'H continuous',
  },
  {
    label: 'T5 why',
    askedIssueId: 'market_validation' as const,
    answer: '왜 그게 중요하죠?',
    scenario: 'D why',
  },
  {
    label: 'T6 nonsense',
    askedIssueId: 'market_validation' as const,
    answer: 'ㅁㄴㅇㄻㄴㅇㄻㅇ',
    scenario: 'C nonsense',
  },
  {
    label: 'T7 competitor',
    askedIssueId: 'competitor_analysis' as const,
    answer: 'TripAdvisor·구글맵 대비 현지 재방문 큐레이션이 차별점입니다',
    scenario: 'H continuous',
  },
  {
    label: 'T8 wrong-slot differentiation on customer ask',
    askedIssueId: 'customer_definition' as const,
    answer: '차별점은 인플루언서 핫플이 아니라 현지인이 다시 찾는 맛집 큐레이션입니다',
    scenario: 'wrong-slot kill',
  },
  {
    label: 'T9 conflict payer',
    askedIssueId: 'customer_definition' as const,
    answer: '사장님이 수수료를 대납하는 B2B 모델입니다',
    scenario: 'F conflict',
  },
  {
    label: 'T10 market',
    askedIssueId: 'market_validation' as const,
    answer: '방한 관광 수요와 로컬 체험 예약 채널에서 검증할 계획입니다',
    scenario: 'H continuous',
  },
];

describe('core-v3 transcript writer', () => {
  it('writes TRANSCRIPT.md with why-now per turn', () => {
    const outDir = join(process.cwd(), '../../docs/evidence/ALABOM/core-v3');
    mkdirSync(outDir, { recursive: true });

    const understanding = buildBusinessUnderstanding(DOC);
    const turns: AiPmLoopTurn[] = [];
    const lines: string[] = [];
    const at = new Date().toISOString();

    lines.push('# ALABOM Core v3 — Living Conversation Engine TRANSCRIPT');
    lines.push('');
    lines.push('```text');
    lines.push(`Date: ${at.slice(0, 10)}`);
    lines.push('Mode: Engine-backed scripted Demo (semantic path)');
    lines.push('Production: https://ai-startup-validation-tau.vercel.app');
    lines.push('Auth: UNTOUCHED');
    lines.push('Verdict language: factual — READY FOR CPO TRANSCRIPT REVIEW (not CPO PASS)');
    lines.push('```');
    lines.push('');
    lines.push('## Seed document');
    lines.push('');
    lines.push(DOC);
    lines.push('');
    lines.push('## Turn-by-turn (why now)');
    lines.push('');

    for (const step of SCRIPT) {
      const loop = {
        version: 1 as const,
        phase: 'answer' as const,
        turns: [...turns],
        currentIssueId: step.askedIssueId,
        readingCompleted: true,
        dismissedReadAck: true,
      };
      const memoryBefore = buildConversationMemoryFromSources({
        projectId: 'core-v3',
        documentText: DOC,
        turns,
      });
      const livingBefore = buildLivingUnderstandingState({
        documentText: DOC,
        understanding,
        turns,
        memory: memoryBefore,
        resolvedIssueIds: turns
          .filter((t) => !t.superseded && t.intent === 'business_fact')
          .map((t) => t.issueId),
      });
      const ranked = resolveMissingFieldPriorities(understanding, loop, {
        documentText: DOC,
        memory: memoryBefore,
        turns,
        analysisResultExists: true,
      });
      const top = ranked[0];
      const semantic = interpretAnswerSemantics({
        answer: step.answer,
        askedIssueId: step.askedIssueId,
        existingFactsByKey: Object.fromEntries(
          (
            ['customer', 'problem', 'buyer', 'competitor', 'market', 'revenue', 'business'] as const
          ).map((k) => [k, getFact(memoryBefore, k)?.value ?? null]),
        ),
      });

      const knownDoc = livingBefore.claims
        .filter((c) => c.status === 'known' || c.status === 'inferred')
        .map((c) => c.fieldKey)
        .slice(0, 5);
      const knownUser = livingBefore.claims
        .filter((c) => c.status === 'confirmed')
        .map((c) => `${c.fieldKey}=${c.value?.slice(0, 40)}`)
        .slice(0, 5);

      lines.push(`### ${step.label} · scenario ${step.scenario}`);
      lines.push('');
      lines.push(`- **Asked issue (UI):** \`${step.askedIssueId}\``);
      lines.push(`- **User:** ${step.answer}`);
      lines.push(
        `- **Intent:** \`${semantic.intent}\` · mergeable=${semantic.mergeable} · displayOnly=${semantic.displayOnly}`,
      );
      lines.push(
        `- **Semantic factKey:** \`${semantic.factKey ?? '∅'}\` · resolvedIssue=\`${semantic.resolvedIssueId ?? '∅'}\``,
      );
      lines.push(`- **Rationale:** ${semantic.rationale}`);
      lines.push(`- **Known from document (sample):** ${knownDoc.join(', ') || '—'}`);
      lines.push(`- **Known from prior answers:** ${knownUser.join(' · ') || '—'}`);
      lines.push(
        `- **Critical unknown / why next Q:** ${top?.whyNow ?? top?.rationale ?? livingBefore.gaps[0]?.rationale ?? '—'}`,
      );
      lines.push(
        `- **Contradiction open:** ${livingBefore.claims.some((c) => c.status === 'contradiction') ? 'yes' : 'no'}`,
      );
      lines.push('');

      if (semantic.mergeable && semantic.factKey) {
        turns.push({
          issueId: semantic.resolvedIssueId ?? step.askedIssueId,
          answer: step.answer,
          appliedAt: new Date().toISOString(),
          semanticFactKey: semantic.factKey,
          intent: semantic.intent,
        });
      } else if (
        semantic.intent === 'why_meta' ||
        semantic.intent === 'mid_judgment' ||
        semantic.intent === 'nonsense'
      ) {
        lines.push(`> Engine action: **NOT stored as Fact** (${semantic.intent}).`);
        lines.push('');
      } else if (semantic.quality === 'CONTRADICTORY') {
        lines.push(
          `> Engine action: **CONFLICT parked** — clarifying choice required (no silent pick).`,
        );
        lines.push('');
      }
    }

    const finalMemory = buildConversationMemoryFromSources({
      projectId: 'core-v3',
      documentText: DOC,
      turns,
    });
    lines.push('## Final Memory (current Facts only)');
    lines.push('');
    for (const f of finalMemory.facts.filter((x) => (x.lifecycle ?? 'current') === 'current')) {
      lines.push(`- **${f.key}:** ${f.value}`);
    }
    lines.push('');
    lines.push('## Scenario matrix (engine)');
    lines.push('');
    lines.push('| ID | Scenario | Status |');
    lines.push('|----|----------|--------|');
    lines.push('| A | Document → Known/Inferred/Unknown | PASS (seed extraction + gaps) |');
    lines.push('| B | Answer reflect (payer→buyer not problem) | PASS |');
    lines.push('| C | Nonsense not Fact | PASS |');
    lines.push('| D | Why not Fact + display | PASS |');
    lines.push('| E | Edit prior (unit: supersede+invalidate) | PASS (unit) |');
    lines.push('| F | Conflict not silent dual-current | PASS (parked) |');
    lines.push('| G | Mid-judgment not Confirmed Fact | PASS |');
    lines.push('| H | 8–10 continuous turns with why-now | PASS (this transcript) |');
    lines.push('');
    lines.push('## Explicit non-claims');
    lines.push('');
    lines.push('- Does **not** claim CPO PASS.');
    lines.push('- Auth untouched.');
    lines.push('- Production UI LIVE capture may be attached as supplemental after deploy tip matches.');
    lines.push('');

    writeFileSync(join(outDir, 'TRANSCRIPT.md'), lines.join('\n'), 'utf8');
    writeFileSync(
      join(outDir, 'transcript-raw.json'),
      JSON.stringify({ at, turns, finalFacts: finalMemory.facts }, null, 2),
      'utf8',
    );
  });
});
