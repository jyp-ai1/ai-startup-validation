import { buildEmptyProjectConversationSeed } from '@/features/workflow-journey/lib/business-understanding/build-empty-project-seed';

/**
 * Project create → Workspace document seed.
 * Title must always reach Understanding (never drop title when description exists).
 */
export function buildProjectIntakeSeed(title: string, description?: string | null): string {
  const trimmedTitle = title.trim() || '새 프로젝트';
  const trimmedDescription = description?.trim() ?? '';

  if (trimmedDescription.length < 2) {
    return buildEmptyProjectConversationSeed(trimmedTitle);
  }

  return [
    `프로젝트 이름: ${trimmedTitle}`,
    '',
    '사업 설명:',
    trimmedDescription,
  ].join('\n');
}
