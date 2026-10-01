import { describe, expect, it } from 'vitest';

import { buildAuthProjectIntakeContent } from '@/lib/project/merge-intake-document';
import { extractDocumentEntities } from '@/features/workflow-journey/lib/domain/extract-document-entities';

const CORE = `고객: 5~30인 피부·치과 원장
문제: no-show 15~25%, EMR과 예약 채널 불일치
수익: 병원 법인 월 구독 SaaS`;

function repeatBlock(times: number): string {
  return Array.from({ length: times }, (_, i) => `배경 단락 ${i + 1}: ${CORE}`).join('\n\n');
}

describe('Long Sprint LS-1 — long document intake parity', () => {
  it('preserves full pastedContent beyond 1000 chars for project create path', () => {
    const longBody = repeatBlock(40);
    expect(longBody.length).toBeGreaterThan(3000);
    const { pastedContent } = buildAuthProjectIntakeContent({
      title: '클리닉플로우 QA',
      documentContent: longBody,
      importSource: 'paste',
    });
    expect(pastedContent.length).toBeGreaterThan(3000);
    expect(pastedContent).toContain('no-show 15~25%');
  });

  it('extracts stable business signal from short vs long paste', () => {
    const short = `사업명: 클리닉플로우\n${CORE}`;
    const long = `${short}\n\n${repeatBlock(20)}`;
    const shortBiz = extractDocumentEntities(short).business.value ?? '';
    const longBiz = extractDocumentEntities(long).business.value ?? '';
    expect(shortBiz.length).toBeGreaterThan(2);
    expect(longBiz).toBe(shortBiz);
  });
});
