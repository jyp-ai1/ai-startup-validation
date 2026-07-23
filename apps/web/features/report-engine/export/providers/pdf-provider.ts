import type { ExecutiveReport, ExportProvider } from '../../types/report-types';

export const mockPdfProvider: ExportProvider = {
  format: 'PDF',
  async generate(report: ExecutiveReport) {
    await delay(1200);
    const fileName = `${slugify(report.projectTitle)}-strategy-report-v${report.version.major}.${report.version.minor}.pdf`;
    return {
      fileName,
      downloadUrl: `#mock-export/pdf/${report.id}`,
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
