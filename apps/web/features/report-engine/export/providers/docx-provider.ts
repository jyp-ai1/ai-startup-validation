import type { ExecutiveReport, ExportProvider } from '../../types/report-types';

export const mockDocxProvider: ExportProvider = {
  format: 'DOCX',
  async generate(report: ExecutiveReport) {
    await delay(1000);
    const fileName = `${slugify(report.projectTitle)}-strategy-memo-v${report.version.major}.${report.version.minor}.docx`;
    return {
      fileName,
      downloadUrl: `#mock-export/docx/${report.id}`,
    };
  },
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}
