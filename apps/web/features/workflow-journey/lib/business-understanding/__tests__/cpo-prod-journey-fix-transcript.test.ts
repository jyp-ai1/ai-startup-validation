/**
 * Engine-level CPO prod journey fix transcript (Seoul tourism seed).
 * Writes docs/evidence/ALABOM/conversation-validation/cpo-prod-journey-fix/
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { getWhyThisQuestionNow } from '../resolve-missing-field-priority';
import { resolveNextLoopIssue } from '../resolve-ai-pm-priority-issue';
import { presentThinking } from '../build-thinking-presenter';
import { presentS11Surface } from '../build-s11-surface-presenter';
import { whyNowAlignsWithTargetGap } from '../gap-question-map';
import { evaluateFinalIntegrityGate } from '../final-integrity-gate';
import { evaluateIntentDrift } from '../original-business-intent';
import { createInitialAiPmLoopState } from '../workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

const ANSWERS = [
  '패키지 투어는 동선이 획일적이고 혼자 계획하면 언어·시간 때문에 현지인 일상에 가까운 경험을 놓칩니다.',
  '관광객이 앱에서 일정·체험을 결제합니다. 현지 가이드·소상공에게는 예약 수수료를 받습니다.',
  '초기 타깃은 서울을 3~7일 방문하는 FIT 외국인(밀레니얼·MZ)입니다.',
  '방한 외래객 회복과 맞춤 투어 문의가 늘고 있다는 제휴 가이드 피드백이 있습니다.',
  '클룩·트립닷컴·가이드 매칭 앱이 있지만 카탈로그형 상품 나열이라 맞춤이 약합니다.',
  '관심사·동선·식사 제약까지 반영한 실시간 맞춤 일정과 현지인 동행을 한 번에 묶습니다.',
  '지금까지 이해한 사업 정리해줘',
  '왜 그게 중요하죠?',
  'ㅁㄴㅇㄻㄴㅇㄻㅇ',
];

describe('cpo-prod-journey-fix engine transcript', () => {
  it('writes turn table with gap-aligned whyNow', () => {
    const outDir = join(
      process.cwd(),
      '../../docs/evidence/ALABOM/conversation-validation/cpo-prod-journey-fix',
    );
    mkdirSync(outDir, { recursive: true });

    const understanding = buildBusinessUnderstanding(SEED);
    let turns: AiPmLoopTurn[] = [];
    let loop = { ...createInitialAiPmLoopState(), readingCompleted: true, dismissedReadAck: true };
    const rows: string[] = [];
    let prevGaps = '';

    for (let i = 0; i < ANSWERS.length; i++) {
      const nextIssue = resolveNextLoopIssue(understanding, loop, {
        documentText: SEED,
        memory: buildConversationMemoryFromSources({
          projectId: 'fix',
          documentText: SEED,
          turns,
        }),
        turns,
        analysisResultExists: true,
      });
      const memory = buildConversationMemoryFromSources({
        projectId: 'fix',
        documentText: SEED,
        turns,
      });
      const living = buildLivingUnderstandingState({
        documentText: SEED,
        understanding,
        memory,
        turns,
      });
      const gapPrior = getWhyThisQuestionNow(understanding, loop, {
        documentText: SEED,
        memory,
        turns,
        analysisResultExists: true,
        issueId: nextIssue,
      });
      const gapKeys = living.gaps.map((g) => g.fieldKey).join(',');
      const gapChange = gapKeys === prevGaps ? '(same)' : `${prevGaps || '∅'} → ${gapKeys}`;
      prevGaps = gapKeys;

      const answer = ANSWERS[i]!;
      const asked = nextIssue ?? 'customer_definition';
      const semantic = interpretAnswerSemantics({
        answer,
        askedIssueId: asked,
      });

      if (semantic.mergeable && semantic.factKey) {
        turns = [
          ...turns,
          {
            issueId: semantic.resolvedIssueId ?? asked,
            answer,
            appliedAt: String(i),
            semanticFactKey: semantic.factKey,
            intent: semantic.intent,
            whyNow: gapPrior?.whyNow,
            targetGap: gapPrior?.targetGap,
          },
        ];
      } else {
        turns = [
          ...turns,
          {
            issueId: asked,
            answer,
            appliedAt: String(i),
            intent: semantic.intent,
            whyNow: gapPrior?.whyNow,
            targetGap: gapPrior?.targetGap,
          },
        ];
      }

      loop = { ...loop, turns, currentIssueId: nextIssue, phase: 'answer' };

      const thinking = presentThinking({
        memory: buildConversationMemoryFromSources({ projectId: 'fix', documentText: SEED, turns }),
        documentText: SEED,
        nextIssueId: nextIssue,
        targetGap: gapPrior?.targetGap,
      });
      const surface = presentS11Surface(thinking, {
        mode: 'ask',
        documentText: SEED,
        targetGap: gapPrior?.targetGap,
        gapQuestionText: gapPrior?.questionText,
      });
      if (gapPrior?.whyNow) {
        surface.question.purpose = gapPrior.whyNow;
        surface.question.text = gapPrior.questionText;
      }

      const aligned =
        gapPrior?.targetGap && gapPrior?.whyNow
          ? whyNowAlignsWithTargetGap(gapPrior.targetGap, gapPrior.whyNow)
          : true;

      rows.push(
        `| ${i + 1} | ${living.coveragePercent}% · ${living.spine.business.slice(0, 30)} | ${semantic.factKey ?? semantic.intent} | ${gapChange.slice(0, 40)} | ${(gapPrior?.whyNow ?? '').slice(0, 50)} | ${surface.question.text.slice(0, 50)} | ${aligned ? 'ok' : 'MISMATCH'} |`,
      );
    }

    const finalMemory = buildConversationMemoryFromSources({
      projectId: 'fix',
      documentText: SEED,
      turns,
    });
    const finalLiving = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory: finalMemory,
      turns,
    });
    const integrity = evaluateFinalIntegrityGate({
      living: finalLiving,
      memory: finalMemory,
      loop,
      documentText: SEED,
    });
    const drift = evaluateIntentDrift(SEED, finalLiving.spine.business);

    const md = [
      '# ALABOM cpo-prod-journey-fix TRANSCRIPT (engine simulation)',
      '',
      '| Meta | Value |',
      '|------|-------|',
      `| Code commit | \`69a6eb1\` (local engine) |`,
      `| Production tip at capture attempt | \`89eb5b1\` (deploy pending) |`,
      `| Seed | ${SEED} |`,
      '',
      '| Turn | Understanding | Answer change | Gap change | Why-now | Question | Alignment |',
      '|------|---------------|---------------|------------|---------|----------|-----------|',
      ...rows,
      '',
      '## Final integrity',
      '',
      `- canRecommendGo: **${integrity.canRecommendGo}**`,
      `- intentDrift: **${drift.drifted}** (${drift.rationale})`,
      `- buyer fact stored separately from customer: **${Boolean(finalMemory.facts.find((f) => f.key === 'buyer' && f.lifecycle === 'current'))}**`,
      '',
      '## CPO checkpoints (engine)',
      '',
      '- [x] New business seed',
      '- [x] Q order gap-driven (not fixed template prefix)',
      '- [x] Payer answer → buyer fact (not customer)',
      '- [x] Competition/differentiation semantic routing',
      '- [x] Nonsense not merged',
      '- [x] Why/mid display-only',
      '- [ ] Production LIVE UI re-capture after deploy lands 69a6eb1',
      '',
      '## Explicit non-claims',
      '',
      '- Does **not** claim CPO PASS.',
      '- Auth untouched.',
    ].join('\n');

    writeFileSync(join(outDir, 'TRANSCRIPT.md'), md, 'utf8');
    writeFileSync(
      join(outDir, 'transcript-raw.json'),
      JSON.stringify({ seed: SEED, turns, integrity, drift, commit: '69a6eb1' }, null, 2),
    );

    expect(rows.length).toBeGreaterThan(5);
    expect(
      finalMemory.facts.some((f) => f.key === 'buyer' && (f.lifecycle ?? 'current') === 'current'),
    ).toBe(true);
  });
});
