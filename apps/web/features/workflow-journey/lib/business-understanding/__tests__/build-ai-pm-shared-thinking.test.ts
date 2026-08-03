import { describe, expect, it } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import {
  buildAiPmSharedThinking,
  formatSharedThinkingProse,
} from '../build-ai-pm-shared-thinking';

const BROAD_CUSTOMER_DOC = `
# 사업계획서
## 고객
중소기업, 제조 공장, 스타트업
## 문제
생산성이 낮습니다.
## 솔루션
AI 기반 생산 관리 SaaS
`.trim();

describe('buildAiPmSharedThinking', () => {
  it('uses thought-arc template (처음에는 → 그런데 → 그래서) for customer gap', () => {
    const understanding = buildBusinessUnderstanding(BROAD_CUSTOMER_DOC);
    const thinking = buildAiPmSharedThinking({
      issueId: 'customer_definition',
      understanding,
      documentText: BROAD_CUSTOMER_DOC,
    });

    expect(thinking).not.toBeNull();
    expect(thinking!.initialThought).toMatch(/^처음에는/);
    expect(thinking!.rethink).toMatch(/^그런데 다시 보니/);
    expect(thinking!.hypothesisBridge).toMatch(/^그래서/);
    expect(thinking!.hypothesisBridge).toContain('같이');
    expect(thinking!.question).toContain('결제');

    const prose = formatSharedThinkingProse(thinking!);
    expect(prose).not.toMatch(/\d+%/);
    expect(prose).not.toMatch(/Confidence|Risk|Score|Priority|등장합니다/i);
    expect(prose).toMatch(/^그런데 다시 보니/);
    expect(prose).not.toContain('처음에는');
    expect(prose).not.toContain('그래서');
  });

  it('returns null when document is too short', () => {
    const thinking = buildAiPmSharedThinking({
      issueId: 'customer_definition',
      understanding: buildBusinessUnderstanding('short'),
      documentText: 'short',
    });
    expect(thinking).toBeNull();
  });

  it('builds BM defer thought when revenue language exists but structure unclear', () => {
    const doc = `
# SaaS
월 구독 BM
기능: 대시보드, 알림
`.trim();
    const thinking = buildAiPmSharedThinking({
      issueId: 'bm_design',
      understanding: buildBusinessUnderstanding(doc),
      documentText: doc,
    });

    expect(thinking?.initialThought).toMatch(/^처음에는/);
    expect(thinking?.rethink).toMatch(/^그런데 다시 보니/);
    expect(thinking?.question).toContain('비용');
  });

  it('builds competitor thought with customer defer when customer unclear', () => {
    const doc = `
# 경쟁
A사, B사와 경쟁
`.trim();
    const thinking = buildAiPmSharedThinking({
      issueId: 'competitor_analysis',
      understanding: buildBusinessUnderstanding(doc),
      documentText: doc,
    });

    expect(thinking?.initialThought).toContain('경쟁');
    expect(thinking?.rethink).toContain('그런데 다시 보니');
  });

  it('builds S3 collaborative thinking after CEO answer (customer → problem)', () => {
    const understanding = buildBusinessUnderstanding(BROAD_CUSTOMER_DOC);
    const turns = [
      {
        issueId: 'customer_definition' as const,
        answer: '구매자는 대표입니다.',
        appliedAt: new Date().toISOString(),
      },
    ];
    const thinking = buildAiPmSharedThinking({
      issueId: 'problem_definition',
      understanding,
      documentText: BROAD_CUSTOMER_DOC,
      turns,
      lastTurn: turns[0],
    });

    expect(thinking?.isContinuous).toBe(true);
    expect(thinking?.acknowledgment).toBeUndefined();
    expect(thinking?.learnedLead).toBe('이제 하나는 명확해졌습니다.');
    expect(thinking?.learnedFact).toBe('구매자는 대표입니다.');
    expect(thinking?.rethink).toContain('좋습니다');
    expect(thinking?.rethink).toContain('구매자는 대표입니다.');
    expect(thinking?.rethink).toContain('왜 돈을 낼 만큼 불편한가');
    expect(thinking?.priorityShift).toContain('시장보다 문제');
    expect(thinking?.hypothesisBridge).toContain('한 뼘 더 선명해질');
    expect(thinking?.agreement.invite).toBe('같이 확인해 볼까요?');
    expect(thinking?.questionPermission).toBe('같이 확인해 볼까요?');
    expect(thinking?.questionLead).toContain('같이');
    expect(thinking?.sharedMemory?.lead).toBe('우리가 지금까지 정리한 내용입니다.');
    expect(thinking?.sharedMemory?.items[0]?.label).toBe('구매자');
    expect(thinking?.businessClarity?.evolutionLead).toMatch(/^이제 사업은 "/);
    expect(thinking?.question).toContain('구매자는 대표입니다.');

    const prose = formatSharedThinkingProse(thinking!);
    expect(prose).toContain('좋습니다');
    expect(prose).not.toContain('처음에는');
    expect(prose).not.toContain('이제 하나는 명확해졌습니다.');
  });
});
