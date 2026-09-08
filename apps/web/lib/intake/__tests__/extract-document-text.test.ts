import { describe, expect, it } from 'vitest';

import { extractDocumentText } from '@/lib/intake/extract-document-text';

describe('extractDocumentText', () => {
  it('A3 — extracts TXT content', async () => {
    const text = '영세 양조장을 위한 온라인 홍보 플랫폼 사업입니다.';
    const buffer = Buffer.from(text, 'utf8');
    const result = await extractDocumentText(buffer, 'plan.txt');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain('양조장');
      expect(result.source).toBe('txt');
    }
  });

  it('A4 — rejects unsupported extension', async () => {
    const buffer = Buffer.from('hello', 'utf8');
    const result = await extractDocumentText(buffer, 'plan.hwp');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unsupported');
    }
  });

  it('A4 — rejects empty TXT', async () => {
    const buffer = Buffer.from('short', 'utf8');
    const result = await extractDocumentText(buffer, 'plan.txt');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty');
    }
  });
});

describe('buildSharedUnderstanding intake priority', () => {
  it('uses 사업 설명 before unreadable fallback for merged intake seed', async () => {
    const { buildSharedUnderstanding } = await import(
      '@/features/workflow-journey/lib/business-understanding/build-shared-understanding'
    );
    const { buildBusinessUnderstanding } = await import(
      '@/features/workflow-journey/lib/business-understanding/build-business-understanding'
    );

    const documentText = [
      '프로젝트 이름: 양조장 마케팅',
      '',
      '사업 설명:',
      '영세 양조장이 온라인에서 제품을 쉽게 홍보하고 판매할 수 있도록 지원하는 서비스',
    ].join('\n');

    const understanding = buildBusinessUnderstanding(documentText);
    const shared = buildSharedUnderstanding({
      documentText,
      turns: [],
      understanding,
      entities: null,
    });

    expect(shared?.business).toContain('양조장');
    expect(shared?.business).not.toContain('충분히 이해하지 못했습니다');
  });
});

describe('readSmartIntakeFile', () => {
  it('reads TXT files client-side without placeholders', async () => {
    const { readSmartIntakeFile } = await import(
      '@/features/workflow-journey/lib/v2-smart-intake-engine'
    );
    const content = '영세 양조장 온라인 홍보 플랫폼 사업 계획서 본문입니다.';
    const file = new File([content], 'plan.txt', { type: 'text/plain' });
    const result = await readSmartIntakeFile(file);
    expect(result.text).toBe(content);
    expect(result.source).toBe('txt');
    expect(result.text).not.toContain('추출되지 않았습니다');
  });
});
