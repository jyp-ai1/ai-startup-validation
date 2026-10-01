import { describe, expect, it } from 'vitest';

import {
  isSmartPmSampleDocument,
  resolveDemoGuidedHydration,
  shouldWipeDemoClientOnFresh,
} from '../../demo-guided-document-hydration';
import { getDemoSample } from '../../demo-samples';

const CEO_DOC = `사업명: 소상공인 매장 홍보 자동화 서비스

고객: 지역 소상공인
문제: 온라인 홍보를 직접 할 시간과 전문성이 부족함
해결방향: SNS 홍보 콘텐츠 자동 생성`;

describe('P0-3A demo guided hydration', () => {
  it('detects SmartPM preset literal', () => {
    expect(isSmartPmSampleDocument(getDemoSample('saas').document)).toBe(true);
    expect(isSmartPmSampleDocument(CEO_DOC)).toBe(false);
  });

  it('skips reseed when custom canonical exists in storage', () => {
    const decision = resolveDemoGuidedHydration({
      demoSampleId: 'custom',
      demoFresh: true,
      customDocumentFromSession: '',
      storedDocument: CEO_DOC,
      hasLoopProgress: false,
      understandingPhase: 'pending',
    });
    expect(decision.kind).toBe('skip_reseed');
  });

  it('skips reseed when loop progress exists', () => {
    const decision = resolveDemoGuidedHydration({
      demoSampleId: 'custom',
      demoFresh: true,
      customDocumentFromSession: CEO_DOC,
      storedDocument: CEO_DOC,
      hasLoopProgress: true,
      understandingPhase: 'accepted',
    });
    expect(decision.kind).toBe('skip_reseed');
  });

  it('applies custom document on first entry', () => {
    const decision = resolveDemoGuidedHydration({
      demoSampleId: 'custom',
      demoFresh: true,
      customDocumentFromSession: CEO_DOC,
      storedDocument: '',
      hasLoopProgress: false,
      understandingPhase: 'pending',
    });
    expect(decision.kind).toBe('apply_sample');
    if (decision.kind === 'apply_sample') {
      expect(decision.document).toContain('소상공인');
      expect(decision.document).not.toContain('스마트PM');
    }
  });

  it('still applies saas sample on fresh preset demo', () => {
    const decision = resolveDemoGuidedHydration({
      demoSampleId: 'saas',
      demoFresh: true,
      customDocumentFromSession: '',
      storedDocument: '',
      hasLoopProgress: false,
      understandingPhase: 'pending',
    });
    expect(decision.kind).toBe('apply_sample');
    if (decision.kind === 'apply_sample') {
      expect(isSmartPmSampleDocument(decision.document)).toBe(true);
    }
  });

  it('fresh wipe only when no loop progress', () => {
    expect(shouldWipeDemoClientOnFresh({ demoFresh: true, hasLoopProgress: false })).toBe(true);
    expect(shouldWipeDemoClientOnFresh({ demoFresh: true, hasLoopProgress: true })).toBe(false);
  });
});
