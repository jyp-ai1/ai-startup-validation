import type { StartupProjectStatus } from '@repo/types/validation';

const STATUS_LABELS: Record<StartupProjectStatus, string> = {
  DRAFT: '초안',
  RESEARCHING: '진행중',
  ANALYZING: '진행중',
  COMPLETED: '완료',
  ARCHIVED: '보관',
};

export function projectStatusLabel(status: StartupProjectStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatRecentActivity(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function displayName(fullName: string | null, email: string): string {
  if (fullName?.trim()) {
    const first = fullName.trim().split(/\s+/)[0] ?? fullName;
    return first.replace(/님$/, '');
  }
  return email.split('@')[0] ?? '대표';
}
