import type { DemoProjectDraft } from './v2-demo-project-store';
import type {
  SmartIntakeAnalysis,
  SmartIntakeFieldId,
  SmartIntakeImportSource,
  SmartIntakeMissingId,
  SmartIntakePricingChoice,
} from './v2-smart-intake-types';

function firstLine(text: string): string {
  return text.split('\n').find((l) => l.trim().length > 0)?.trim() ?? '';
}

function findSection(text: string, keywords: string[]): string {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.toLowerCase() ?? '';
    if (keywords.some((k) => line.includes(k))) {
      const next = lines.slice(i, i + 3).join(' ').trim();
      if (next.length > 8) return next.slice(0, 120);
    }
  }
  return '';
}

function hasKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function analyzeSmartIntakeDocument(
  raw: string,
  source: SmartIntakeImportSource = 'paste',
): SmartIntakeAnalysis {
  const text = raw.trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const serviceName =
    lines[0]?.replace(/^[#\-\*]\s*/, '').slice(0, 40) ||
    findSection(text, ['서비스', 'service', '프로젝트', 'product']) ||
    '내 프로젝트';

  const tagline =
    lines[1]?.slice(0, 80) ||
    findSection(text, ['한줄', '소개', 'summary', 'tagline', 'overview']) ||
    lines[0]?.slice(0, 80) ||
    serviceName;

  const problem =
    findSection(text, ['문제', 'problem', 'pain', '불편', '과제']) ||
    (text.length > 20 ? text.slice(0, 160) : '');

  const customer =
    findSection(text, ['고객', 'customer', 'target', '사용자', 'user']) ||
    (hasKeyword(text, ['창업', 'startup', 'pm', '대표']) ? '예비창업자 · 스타트업 대표' : '');

  const market =
    findSection(text, ['시장', 'market', 'tam', 'sam']) ||
    (hasKeyword(text, ['saas', 'b2b', 'b2c', '플랫폼']) ? '성장 중인 SaaS 시장' : '');

  const bm =
    findSection(text, ['bm', '비즈니스', 'business model', '수익', 'pricing', '가격']) ||
    (hasKeyword(text, ['구독', 'subscription']) ? '구독 모델 검토 중' : '');

  const competition =
    findSection(text, ['경쟁', 'competitor', 'competition', '대안']) ||
    (hasKeyword(text, ['cursor', 'notion', 'chatgpt']) ? 'AI 도구 · 생산성 도구 경쟁' : '');

  const extracted: Record<SmartIntakeFieldId, boolean> = {
    problem: problem.length >= 8,
    customer: customer.length >= 4,
    market: market.length >= 4,
    bm: bm.length >= 4,
    competition: competition.length >= 4,
  };

  const filledCount = Object.values(extracted).filter(Boolean).length;
  const completenessScore = Math.min(95, 52 + filledCount * 9 + (text.length > 120 ? 8 : 0));
  const completenessStars = completenessScore >= 85 ? 5 : completenessScore >= 75 ? 4 : 3;

  const missing: SmartIntakeMissingId[] = [];
  if (!hasKeyword(text, ['가격', 'pricing', '구독', 'subscription', '무료', 'free'])) {
    missing.push('pricing');
  }
  if (!hasKeyword(text, ['인터뷰', 'interview', '고객 검증'])) {
    missing.push('customerInterview');
  }
  if (!hasKeyword(text, ['gtm', 'go-to-market', '출시', 'launch'])) {
    missing.push('gtm');
  }

  return {
    serviceName,
    tagline,
    problem: problem || tagline,
    customer: customer || '예비창업자',
    market: market || '시장 정보 보완 필요',
    bm: bm || 'BM 정보 보완 필요',
    competition: competition || '경쟁 정보 보완 필요',
    extracted,
    missing,
    completenessScore,
    completenessStars,
  };
}

export function buildDraftFromAnalysis(
  analysis: SmartIntakeAnalysis,
  pastedContent: string,
  source: SmartIntakeImportSource,
  pricingModel?: SmartIntakePricingChoice,
): DemoProjectDraft {
  return {
    serviceName: analysis.serviceName,
    tagline: analysis.tagline,
    customer: analysis.customer,
    problem: analysis.problem,
    pastedContent,
    importSource: source,
    pricingModel,
    completenessScore: analysis.completenessScore,
    extracted: analysis.extracted,
    missing: analysis.missing,
  };
}

export async function readSmartIntakeFile(file: File): Promise<{ text: string; source: SmartIntakeImportSource }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'txt';
  if (ext === 'pdf') {
    const demoText = `[${file.name}]\n\nPDF 문서를 불러왔습니다. AI PM이 문서 구조를 분석합니다.`;
    return { text: demoText, source: 'pdf' };
  }
  if (ext === 'docx') {
    const demoText = `[${file.name}]\n\nWord 문서를 불러왔습니다. AI PM이 핵심 섹션을 추출합니다.`;
    return { text: demoText, source: 'docx' };
  }
  if (ext === 'md' || ext === 'markdown') {
    return { text: await file.text(), source: 'md' };
  }
  return { text: await file.text(), source: 'txt' };
}

export function isSmartIntakeContentValid(content: string): boolean {
  return content.trim().length >= 40;
}
