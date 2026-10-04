import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { extractDocumentText } from '@/lib/intake/extract-document-text';

function makePdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objs = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n',
    '2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n',
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n',
    `4 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(body));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body);
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `${xref}trailer<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body);
}

const DOCX_FIXTURE = path.join(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  'fixtures/brewery-short.docx',
);

describe('P0 document upload extraction', () => {
  it('extracts Korean brewery text from a generated PDF', async () => {
    const buffer = makePdf('Yangjojang brewery locals and foreigners');
    const result = await extractDocumentText(buffer, 'plan.pdf');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe('pdf');
      expect(result.text).toMatch(/Yangjojang|brewery|locals/i);
    }
  });

  it('extracts Korean brewery text from a generated DOCX', async () => {
    const buffer = readFileSync(DOCX_FIXTURE);
    const result = await extractDocumentText(buffer, 'plan.docx');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe('docx');
      expect(result.text).toContain('양조장');
      expect(result.text).toContain('내국인');
    }
  });

  it('classifies a truncated PDF as parse_failed with a visible reason', async () => {
    const result = await extractDocumentText(Buffer.from('%PDF-1.4 not-a-real-file'), 'broken.pdf');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('parse_failed');
      expect(result.detail ?? '').toMatch(/./);
    }
  });

  it('rejects unsupported types with a precise reason', async () => {
    const result = await extractDocumentText(Buffer.from('hello world'), 'plan.hwp');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unsupported');
    }
  });
});
