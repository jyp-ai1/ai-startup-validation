import { describe, it, expect } from 'vitest';

import {
  buildAuthProjectIntakeContent,
  mergeProjectIntakeDocument,
} from '../merge-intake-document';

describe('mergeProjectIntakeDocument', () => {
  it('prepends project title to raw business body', () => {
    const out = mergeProjectIntakeDocument('주인집1', '영세한 양조장들이 온라인 마케팅을 잘 못하고 있습니다.');
    expect(out).toContain('프로젝트 이름: 주인집1');
    expect(out).toContain('영세한 양조장');
  });

  it('preserves existing structured intake', () => {
    const structured = '프로젝트 이름: A\n\n사업 설명:\nB';
    expect(mergeProjectIntakeDocument('X', structured)).toBe(structured);
  });
});

describe('buildAuthProjectIntakeContent', () => {
  it('uses uploaded document when present', () => {
    const result = buildAuthProjectIntakeContent({
      title: '주인집1',
      description: '',
      documentContent: '영세한 양조장 온라인 마케팅',
      importSource: 'pdf',
      fileName: 'plan.pdf',
    });
    expect(result.pastedContent).toContain('주인집1');
    expect(result.pastedContent).toContain('양조장');
    expect(result.importSource).toBe('pdf');
    expect(result.fileName).toBe('plan.pdf');
  });

  it('falls back to title + description when no file', () => {
    const result = buildAuthProjectIntakeContent({
      title: '테스트',
      description: '사업 설명 텍스트',
    });
    expect(result.pastedContent).toContain('프로젝트 이름: 테스트');
    expect(result.pastedContent).toContain('사업 설명 텍스트');
  });
});
