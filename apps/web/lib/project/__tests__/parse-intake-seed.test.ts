import { describe, it, expect } from 'vitest';

import { businessBodyForReviewMatch, parseIntakeSeedDocument } from '../parse-intake-seed';

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

  it('matches a stored review to the business body inside the project document', () => {
    const body = '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 양조장 체험을 안내한다.';
    const document = ['프로젝트 이름: 주인집 13', '', '사업 설명:', body].join('\n');
    expect(businessBodyForReviewMatch(document)).toBe(body);
    expect(businessBodyForReviewMatch(body)).toBe(body);
    expect(businessBodyForReviewMatch(document)).toBe(businessBodyForReviewMatch(body));
  });

  it('matches a review that also stored the purpose lines', () => {
    const body = '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 양조장 체험을 안내한다.';
    const stored = `${body}\n\n검토 목적: 종합 검토\n현재 단계: 아이디어\n가장 알고 싶은 것: 없음`;
    expect(businessBodyForReviewMatch(stored)).toBe(body);
    expect(businessBodyForReviewMatch(stored)).toBe(businessBodyForReviewMatch(body));
  });
});
