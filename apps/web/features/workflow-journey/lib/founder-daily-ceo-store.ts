const APPROVAL_KEY = 'll_daily_ceo_approval_v1';
const OVERNIGHT_KEY = 'll_daily_ceo_overnight_v1';

export type TodayApprovalChoice = 'pending' | 'approved' | 'tomorrow' | 'hold';

type ApprovalRecord = {
  date: string;
  choice: TodayApprovalChoice;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadTodayApproval(projectId: string): TodayApprovalChoice {
  if (typeof window === 'undefined') return 'pending';
  try {
    const raw = localStorage.getItem(APPROVAL_KEY);
    if (!raw) return 'pending';
    const all = JSON.parse(raw) as Record<string, ApprovalRecord>;
    const record = all[projectId];
    if (!record || record.date !== todayKey()) return 'pending';
    return record.choice;
  } catch {
    return 'pending';
  }
}

export function saveTodayApproval(projectId: string, choice: TodayApprovalChoice): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(APPROVAL_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, ApprovalRecord>) : {};
    all[projectId] = { date: todayKey(), choice };
    localStorage.setItem(APPROVAL_KEY, JSON.stringify(all));
  } catch {
    // non-blocking
  }
}

export function loadOvernightViewed(projectId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(OVERNIGHT_KEY);
    if (!raw) return false;
    const all = JSON.parse(raw) as Record<string, string>;
    return all[projectId] === todayKey();
  } catch {
    return false;
  }
}

export function markOvernightViewed(projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(OVERNIGHT_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    all[projectId] = todayKey();
    localStorage.setItem(OVERNIGHT_KEY, JSON.stringify(all));
  } catch {
    // non-blocking
  }
}
