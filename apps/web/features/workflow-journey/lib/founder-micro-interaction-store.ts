const STORAGE_KEY = 'll_founder_micro_answers';

export type FounderMicroAnswers = {
  targetCustomer?: 'office' | 'student' | 'enterprise' | 'unknown';
  hasMvp?: 'yes' | 'no';
};

export function loadFounderMicroAnswers(): FounderMicroAnswers {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FounderMicroAnswers;
  } catch {
    return {};
  }
}

export function saveFounderMicroAnswer<K extends keyof FounderMicroAnswers>(
  key: K,
  value: FounderMicroAnswers[K],
): void {
  if (typeof window === 'undefined') return;
  const current = loadFounderMicroAnswers();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, [key]: value }));
}
