const VALIDATION_IDEA_KEY = 'll_v2_validation_idea';
const VALIDATION_SCORE_KEY = 'll_v2_validation_score';
const VALIDATION_OPTIONS_KEY = 'll_v2_validation_options';

export type V2ValidationOptions = {
  problem?: boolean;
  customer?: boolean;
  mvp?: boolean;
  pricing?: boolean;
};

export function saveV2Validation(idea: string, score: number, options: V2ValidationOptions): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(VALIDATION_IDEA_KEY, idea.trim());
  sessionStorage.setItem(VALIDATION_SCORE_KEY, String(score));
  sessionStorage.setItem(VALIDATION_OPTIONS_KEY, JSON.stringify(options));
  sessionStorage.setItem('ll_project_registration', JSON.stringify({
    projectName: deriveProjectName(idea),
    ideaOneLiner: idea.trim(),
    websiteUrl: '',
    targetMarket: '',
    optionalNote: '',
  }));
}

export function loadV2Validation(): {
  idea: string;
  score: number;
  options: V2ValidationOptions;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const idea = sessionStorage.getItem(VALIDATION_IDEA_KEY);
    const scoreRaw = sessionStorage.getItem(VALIDATION_SCORE_KEY);
    const optionsRaw = sessionStorage.getItem(VALIDATION_OPTIONS_KEY);
    if (!idea || !scoreRaw) return null;
    const score = Number.parseInt(scoreRaw, 10);
    const options = optionsRaw ? (JSON.parse(optionsRaw) as V2ValidationOptions) : {};
    return { idea, score: Number.isFinite(score) ? score : 41, options };
  } catch {
    return null;
  }
}

function deriveProjectName(idea: string): string {
  const trimmed = idea.trim();
  if (trimmed.length <= 36) return trimmed;
  return `${trimmed.slice(0, 33).trim()}…`;
}
