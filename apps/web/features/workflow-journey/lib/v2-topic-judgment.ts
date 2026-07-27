import type { InvestigationTopic } from './v2-next-action-engine';
import {
  MOCK_INVESTIGATION_EVIDENCE,
  type InvestigationEvidence,
} from './v2-evidence-mock-data';

export type EvidenceTrend = 'up' | 'down' | 'flat';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type TopicRecentChange = {
  changedAtLabel: string;
  previousStars: number;
  previousVerdict: string;
  reasonBullets: string[];
};

export type TopicJudgmentView = {
  stars: number;
  verdict: string;
  judgmentParagraphs: string[];
  evidenceBullets: string[];
  nextAction: string;
  nextActionWhy: string;
  actionChecklist: string[];
  aiInsight: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  trend: EvidenceTrend;
  starDelta: number;
  recentChange: TopicRecentChange | null;
};

const TOPICS: InvestigationTopic[] = ['market', 'competition', 'pricing', 'differentiation'];

export function getTopicJudgment(topic: InvestigationTopic): TopicJudgmentView {
  const data = MOCK_INVESTIGATION_EVIDENCE[topic];
  return {
    stars: data.stars,
    verdict: data.verdict,
    judgmentParagraphs: data.judgmentParagraphs,
    evidenceBullets: data.evidenceBullets,
    nextAction: data.nextAction,
    nextActionWhy: data.nextActionWhy,
    actionChecklist: data.actionChecklist,
    aiInsight: data.aiInsight,
    confidence: data.confidence,
    confidenceLevel: data.confidenceLevel,
    trend: data.trend,
    starDelta: data.starDelta,
    recentChange: data.recentChange,
  };
}

export function getAllTopicStars(): Array<{
  topic: InvestigationTopic;
  stars: number;
  trend: EvidenceTrend;
  starDelta: number;
  confidence: number;
  evidenceCount: number;
}> {
  return TOPICS.map((topic) => {
    const data = MOCK_INVESTIGATION_EVIDENCE[topic];
    return {
      topic,
      stars: data.stars,
      trend: data.trend,
      starDelta: data.starDelta,
      confidence: data.confidence,
      evidenceCount: data.evidenceCount,
    };
  });
}

export function getEvidenceForTopic(topic: InvestigationTopic): InvestigationEvidence[InvestigationTopic] {
  return MOCK_INVESTIGATION_EVIDENCE[topic];
}

export { MOCK_INVESTIGATION_EVIDENCE };
