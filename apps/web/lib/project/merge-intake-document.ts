/**
 * DAY 8-I P0-11 — Merge project title with uploaded/pasted business document.
 * Matches FIX-10 intake seed shape (프로젝트 이름 + 사업 설명).
 */

import { buildProjectIntakeSeed } from './build-project-intake-seed';

export function mergeProjectIntakeDocument(title: string, documentBody: string): string {
  const trimmedTitle = title.trim() || '새 프로젝트';
  const body = documentBody.trim();
  if (!body) return '';

  if (/^프로젝트 이름:/m.test(body)) {
    return body;
  }

  const businessSection = body.startsWith('사업 설명:')
    ? body
    : `사업 설명:\n${body}`;

  return [`프로젝트 이름: ${trimmedTitle}`, '', businessSection].join('\n');
}

export function buildAuthProjectIntakeContent(input: {
  title: string;
  description?: string;
  documentContent?: string;
  importSource?: string;
  fileName?: string;
}): { pastedContent: string; importSource: string; fileName?: string } {
  const title = input.title.trim();
  const description = input.description?.trim() ?? '';
  const documentContent = input.documentContent?.trim() ?? '';
  const importSource = input.importSource?.trim() || 'paste';
  const fileName = input.fileName?.trim() || undefined;

  if (documentContent.length >= 8) {
    let pasted = mergeProjectIntakeDocument(title, documentContent);
    if (description.length >= 2 && !pasted.includes(description)) {
      pasted = `${pasted}\n\n추가 설명:\n${description}`;
    }
    return { pastedContent: pasted, importSource, fileName };
  }

  return {
    pastedContent: buildProjectIntakeSeed(title, description.length >= 2 ? description : null),
    importSource: 'paste',
  };
}
