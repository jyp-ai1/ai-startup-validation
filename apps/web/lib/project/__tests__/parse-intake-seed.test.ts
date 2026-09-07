import { describe, it, expect } from 'vitest';

import { parseIntakeSeedDocument } from '../parse-intake-seed';

describe('parseIntakeSeedDocument (FIX-10)', () => {
  it('separates project title from business description', () => {
    const doc = [
      '프로젝트 이름: 주인집1',
      '',
      '사업 설명:',
      '영세한 양조장들이 온라인 마케팅을 잘 못하고 있어서, 양조장을 온라인 시장에 홍보하고 지역경제를 활성화하는 모델입니다.',
    ].join('\n');

    const parsed = parseIntakeSeedDocument(doc);
    expect(parsed.projectTitle).toBe('주인집1');
    expect(parsed.businessDescription).toMatch(/영세한 양조장/);
    expect(parsed.businessOneLinerCandidate).not.toBe('주인집1');
  });
});
