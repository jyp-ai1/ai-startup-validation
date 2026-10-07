import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  detectDocumentKind,
  extractDocumentText,
  resolvePdfWorkerPath,
} from '@/lib/intake/extract-document-text';
import { resolveSiJourneyIntegration } from '@/features/strategic-intelligence/lib/resolve-si-journey-integration';

const SAMPLE_DIR = resolve(process.cwd(), '../../docs/evidence/ALABOM/SI/samples');
const SAMPLE_PDFS = [
  {
    id: 'ridm',
    fileName: 'ridm-투자자-사업계획서-260317.pdf',
    founderName: '투자자 사업계획서_ridm_260317.pdf',
    mustInclude: /RIDM|Float|플로트/i,
  },
  {
    id: 'lmulm',
    fileName: 'lmulm-2024-초기창업패키지-사업계획서.pdf',
    founderName: 'lmulm-2024-초기창업패키지-사업계획서.pdf',
    mustInclude: /엘엠유엘엠|LMULM|한정판|문구/i,
  },
  {
    id: 'juinjip',
    fileName: 'juinjip-예비관광벤처-사업실행계획서-260519.pdf',
    founderName: 'juinjip-예비관광벤처-사업실행계획서-260519.pdf',
    mustInclude: /酒人集|양조|취향저격/i,
  },
] as const;

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

describe('PDF worker packaging', () => {
  it('resolves pdf-parse CJS worker so serverless fake-worker can load', () => {
    const workerPath = resolvePdfWorkerPath();
    expect(workerPath).toBeTruthy();
    expect(workerPath).toMatch(/pdf\.worker\.mjs$/);
  });
});

describe('PDF kind detection', () => {
  it('recognizes PDF by magic and MIME when the extension is missing', () => {
    const buffer = Buffer.from('%PDF-1.4 leftover header');
    expect(detectDocumentKind('blob', buffer, 'application/pdf')).toBe('pdf');
    expect(detectDocumentKind('투자자 사업계획서_ridm_260317.pdf', buffer, '')).toBe('pdf');
  });

  it('does not treat a text file as PDF just because the name mentions pdf', () => {
    const buffer = Buffer.from('영세 양조장을 위한 온라인 홍보 플랫폼 사업입니다.');
    expect(detectDocumentKind('notes.txt', buffer, 'text/plain')).toBe('txt');
  });
});

describe('P0 PDF ingestion — 3 founder business plans', () => {
  it('extracts usable Korean text from each sample PDF', async () => {
    for (const sample of SAMPLE_PDFS) {
      const buffer = readFileSync(resolve(SAMPLE_DIR, sample.fileName));
      const result = await extractDocumentText(buffer, sample.founderName, 'application/pdf');
      expect(result.ok, sample.id).toBe(true);
      if (result.ok) {
        expect(result.source).toBe('pdf');
        expect(result.text.length).toBeGreaterThan(80);
        expect(result.text).toMatch(sample.mustInclude);
        expect(result.text).not.toContain('추출되지 않았습니다');
      }
    }
  });

  it('feeds extracted PDF text into S.I. Judgment → CU → DCE → Question', async () => {
    for (const sample of SAMPLE_PDFS) {
      const buffer = readFileSync(resolve(SAMPLE_DIR, sample.fileName));
      const extracted = await extractDocumentText(buffer, sample.founderName, 'application/pdf');
      expect(extracted.ok, sample.id).toBe(true);
      if (!extracted.ok) continue;

      const view = resolveSiJourneyIntegration({
        businessDocument: extracted.text,
      });
      expect(view.firstJudgment.judgment.startsWith('현재 판단:'), sample.id).toBe(true);
      expect(view.firstJudgment.criticalUnknown.length, sample.id).toBeGreaterThan(12);
      expect(/올리|내리|유지/.test(view.firstJudgment.decisionChangingEvidence), sample.id).toBe(true);
      expect(/습니까|알려주세요/.test(view.firstQuestion.questionText), sample.id).toBe(true);
      expect(view.firstQuestion.questionText, sample.id).not.toBe(view.firstJudgment.criticalUnknown);
    }
  });

  it('labels a textless PDF as image_pdf instead of unsupported', async () => {
    const emptyPdf = Buffer.from('%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n', 'latin1');
    const result = await extractDocumentText(emptyPdf, 'scan.pdf', 'application/pdf');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason === 'image_pdf' || result.reason === 'parse_failed').toBe(true);
      expect(result.reason).not.toBe('unsupported');
    }
  });
});
