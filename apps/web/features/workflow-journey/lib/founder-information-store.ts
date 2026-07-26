const STORAGE_KEY = 'll_founder_information_v1';

export type FounderInformationField =
  | 'problem'
  | 'customer'
  | 'mvp'
  | 'progress'
  | 'advantage'
  | 'pricing';

export type FounderInformationAnswers = Partial<Record<FounderInformationField, string>>;

export function loadFounderInformation(): FounderInformationAnswers {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as FounderInformationAnswers;
  } catch {
    return {};
  }
}

export function saveFounderInformationField(
  field: FounderInformationField,
  value: string,
): void {
  if (typeof window === 'undefined') return;
  const current = loadFounderInformation();
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...current, [field]: value.trim() }),
  );
}

export function clearFounderInformationField(field: FounderInformationField): void {
  if (typeof window === 'undefined') return;
  const current = { ...loadFounderInformation() };
  delete current[field];
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}
