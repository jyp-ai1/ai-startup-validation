import { describe, expect, it } from 'vitest';

import { buildDocumentFirstDraft } from '../build-document-first-draft';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { extractDocumentEntities } from '../../domain/extract-document-entities';
import { SHARED_UNDERSTANDING_PENDING } from '../build-shared-understanding';

/** CPO P0-2B Production CEO brewery paste document */
export const P0_2B_CEO_DOC = `# 영세 양조장 온라인 홍보 SaaS

사업: 영세 양조장을 위한 B2B SaaS

고객의 니즈는 많으나 그들에게 손쉬운 온라인 홍보플랫폼을 만들어 제공하려 함.

대상: 소규모 양조장`;

describe('P0-2B under-extraction — CEO brewery document', () => {
  it('extracts target customer from 「대상:」 line', () => {
    const entities = extractDocumentEntities(P0_2B_CEO_DOC);
    expect(entities.customer.basis).toBe('document');
    expect(entities.customer.value).toMatch(/소규모\s*양조장/);
  });

  it('extracts need line into problem field from document text', () => {
    const understanding = buildBusinessUnderstanding(P0_2B_CEO_DOC);
    expect(understanding.problem.status).toBe('document');
    expect(understanding.problem.value).toMatch(/니즈|홍보플랫폼/);
    expect(understanding.customer.value).toMatch(/소규모\s*양조장/);
  });

  it('document-first draft shows customer and problem (not slot-filled)', () => {
    const understanding = buildBusinessUnderstanding(P0_2B_CEO_DOC);
    const draft = buildDocumentFirstDraft({
      documentText: P0_2B_CEO_DOC,
      understanding,
      entities: extractDocumentEntities(P0_2B_CEO_DOC),
    });
    expect(draft).not.toBeNull();
    const customer = draft!.fields.find((f) => f.id === 'customer');
    const problem = draft!.fields.find((f) => f.id === 'problem');
    const business = draft!.fields.find((f) => f.id === 'business');
    expect(customer?.value).toMatch(/양조장/);
    expect(customer?.value).not.toBe(SHARED_UNDERSTANDING_PENDING);
    expect(problem?.value).toMatch(/니즈|홍보/);
    expect(problem?.value).not.toBe(SHARED_UNDERSTANDING_PENDING);
    expect(business?.value).toMatch(/영세 양조장|홍보 SaaS/i);
  });
});
