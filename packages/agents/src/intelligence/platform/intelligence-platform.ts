import {
  chatService,
  getAIPlatform,
  isProviderConfigured,
  resolveDefaultModel,
} from '@repo/ai';
import { Logger } from '@repo/core/logger';

import type { AgentProjectContext, AgentProviderId } from '../../types';
import type { IntelligenceDomain, IntelligencePlatformInput, IntelligencePlatformResult, IntelligenceReport } from './types';
import { INTELLIGENCE_DOMAINS } from './types';

type DomainJson = {
  domain?: IntelligenceDomain;
  title?: string;
  summary?: string;
  confidence?: number;
  signals?: string[];
};

type PlatformJson = {
  domains?: DomainJson[];
};

const MOCK_BY_DOMAIN: Record<IntelligenceDomain, Omit<IntelligenceReport, 'fetchedAt' | 'providerId' | 'fromRealRun'>> = {
  competitor: {
    domain: 'competitor',
    title: '경쟁사 가격 변동',
    summary: '직접 경쟁 2곳이 가격을 조정했습니다.',
    confidence: 72,
    signals: ['price_change', 'new_feature'],
    sources: [{ id: 'comp-1', title: 'Competitor scan', sourceType: 'DATABASE' }],
  },
  market: {
    domain: 'market',
    title: '시장 검색 트렌드',
    summary: '카테고리 검색량이 지난주 대비 증가했습니다.',
    confidence: 68,
    signals: ['search_volume_up'],
    sources: [{ id: 'mkt-1', title: 'Market trend', sourceType: 'NEWS' }],
  },
  pricing: {
    domain: 'pricing',
    title: '가격 벤치마크',
    summary: '유사 SKU 평균 가격대가 확인되었습니다.',
    confidence: 65,
    signals: ['benchmark_ready'],
    sources: [{ id: 'price-1', title: 'Pricing benchmark', sourceType: 'REPORT' }],
  },
  government: {
    domain: 'government',
    title: '정부지원 공고',
    summary: '신규 TIPS 관련 공고가 게시되었습니다.',
    confidence: 70,
    signals: ['grant_new'],
    sources: [{ id: 'gov-1', title: 'Grant portal', sourceType: 'GOVERNMENT' }],
  },
  customer: {
    domain: 'customer',
    title: '고객 VOC',
    summary: '속도 불만이 가격보다 자주 언급됩니다.',
    confidence: 74,
    signals: ['voc_speed'],
    sources: [{ id: 'cust-1', title: 'Customer interviews', sourceType: 'WEB' }],
  },
  investment: {
    domain: 'investment',
    title: '투자 환경',
    summary: 'Seed 라운드 활동이 같은 카테고리에서 증가했습니다.',
    confidence: 60,
    signals: ['funding_active'],
    sources: [{ id: 'inv-1', title: 'Investment news', sourceType: 'NEWS' }],
  },
};

function mockReports(providerId: AgentProviderId): IntelligenceReport[] {
  const now = new Date().toISOString();
  return INTELLIGENCE_DOMAINS.map((domain) => ({
    ...MOCK_BY_DOMAIN[domain],
    fetchedAt: now,
    providerId,
    fromRealRun: false,
  }));
}

function buildPrompt(context: AgentProjectContext): { system: string; user: string } {
  const isKo = (context.locale ?? 'ko').startsWith('ko');
  return {
    system: isKo
      ? '당신은 스타트업 AI PM입니다. 6개 intelligence domain JSON만 반환하세요.'
      : 'You are a startup AI PM. Return JSON for 6 intelligence domains only.',
    user: isKo
      ? `프로젝트: ${context.projectTitle}\n아이디어: ${context.ideaSummary}\n산업: ${context.industry ?? 'unknown'}\n\ndomains: competitor, market, pricing, government, customer, investment\n각 domain마다 title, summary, confidence(0-100), signals[]`
      : `Project: ${context.projectTitle}\nIdea: ${context.ideaSummary}\nIndustry: ${context.industry ?? 'unknown'}\n\nReturn domains array with title, summary, confidence, signals for each intelligence domain.`,
  };
}

async function fetchOpenRouterReports(
  context: AgentProjectContext,
  providerId: AgentProviderId,
): Promise<IntelligenceReport[] | null> {
  if (!isProviderConfigured('openrouter')) return null;

  getAIPlatform();
  const prompt = buildPrompt(context);

  try {
    const response = await chatService.chat({
      model: resolveDefaultModel('openrouter'),
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature: 0.25,
      maxTokens: 1800,
      responseFormat: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.content) as PlatformJson;
    const now = new Date().toISOString();
    const mockMap = Object.fromEntries(
      mockReports(providerId).map((report) => [report.domain, report]),
    ) as Record<IntelligenceDomain, IntelligenceReport>;

    return INTELLIGENCE_DOMAINS.map((domain) => {
      const fromLlm = parsed.domains?.find((item) => item.domain === domain);
      const fallback = mockMap[domain]!;
      if (fromLlm?.summary) {
        return {
          domain,
          title: fromLlm.title ?? fallback.title,
          summary: fromLlm.summary,
          confidence: Math.min(95, Math.max(20, fromLlm.confidence ?? fallback.confidence)),
          signals: fromLlm.signals?.length ? fromLlm.signals : fallback.signals,
          sources: fallback.sources,
          fetchedAt: now,
          providerId,
          fromRealRun: true,
        };
      }
      return { ...fallback, fromRealRun: false };
    });
  } catch {
    return null;
  }
}

export async function runIntelligencePlatform(
  input: IntelligencePlatformInput,
): Promise<IntelligencePlatformResult> {
  const providerId = input.providerId ?? 'openrouter';
  const logger = new Logger({ namespace: 'IntelligencePlatform' });

  let reports = await fetchOpenRouterReports(input.context, providerId);
  if (!reports) {
    logger.warn('Using mock intelligence platform', { projectId: input.context.projectId });
    reports = mockReports('mock');
  }

  const investigationCount = reports.reduce(
    (sum, report) => sum + report.signals.length + report.sources.length,
    reports.length * 2,
  );
  const importantCount = reports.filter((report) => report.confidence >= 68).slice(0, 3).length;

  return {
    runId: `intel-${input.context.projectId}-${Date.now()}`,
    projectId: input.context.projectId,
    reports,
    investigationCount,
    importantCount: Math.max(1, importantCount),
    completedAt: new Date().toISOString(),
    providerId: reports.some((report) => report.fromRealRun) ? providerId : 'mock',
  };
}
