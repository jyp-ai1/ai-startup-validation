import type { ExecutiveReport, ExportProvider } from '../../types/report-types';

export const mockPptxProvider: ExportProvider = {
  format: 'PPTX',
  async generate(report: ExecutiveReport) {
    await delay(1500);
    const fileName = `${slugify(report.projectTitle)}-board-deck-v${report.version.major}.${report.version.minor}.pptx`;
    return {
      fileName,
      downloadUrl: `#mock-export/pptx/${report.id}`,
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
