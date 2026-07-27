import type { InvestigationTopic } from './v2-next-action-engine';
import { MOCK_INVESTIGATION_EVIDENCE } from './v2-evidence-mock-data';

export type EvidenceLibraryCategory =
  | 'market'
  | 'competition'
  | 'pricing'
  | 'customer'
  | 'technology'
  | 'funding'
  | 'trend'
  | 'news';

export type EvidenceLibraryItem = {
  id: string;
  category: EvidenceLibraryCategory;
  topic: InvestigationTopic;
  source: string;
  metric: string;
  interpretation: string;
  meaning: string;
  whyImportant: string;
};

const EXTRA_ITEMS: EvidenceLibraryItem[] = [
  {
    id: 'reddit-1',
    category: 'news',
    topic: 'competition',
    source: 'Reddit',
    metric: 'r/startups · 12 threads / month',
    interpretation: 'Founders complain about one-shot AI validation reports.',
    meaning: 'Workspace loop beats report-only tools.',
    whyImportant: 'Validates LaunchLens positioning vs report SaaS.',
  },
  {
    id: 'funding-1',
    category: 'funding',
    topic: 'market',
    source: 'Crunchbase',
    metric: 'Seed 4 rounds (2025–2026)',
    interpretation: 'Founder-tool category attracting early capital.',
    meaning: 'Investors see demand; speed matters.',
    whyImportant: 'Confirms market timing for entry.',
  },
  {
    id: 'customer-1',
    category: 'customer',
    topic: 'differentiation',
    source: 'Founder interviews (mock)',
    metric: '5/8 want decision memory',
    interpretation: 'Founders forget why they decided last week.',
    meaning: 'Decision Story is a real pain, not a nice-to-have.',
    whyImportant: 'Core LaunchLens differentiation signal.',
  },
  {
    id: 'tech-1',
    category: 'technology',
    topic: 'competition',
    source: 'Product Hunt',
    metric: '8 AI validation launches',
    interpretation: 'Most are chat wrappers without evidence loop.',
    meaning: 'Evidence Library + Interpretation is rare.',
    whyImportant: 'Technical moat is workflow, not LLM.',
  },
];

function sourceToCategory(label: string): EvidenceLibraryCategory {
  const lower = label.toLowerCase();
  if (lower.includes('trend')) return 'trend';
  if (lower.includes('news') || lower.includes('reddit')) return 'news';
  if (lower.includes('crunchbase') || lower.includes('seed')) return 'funding';
  if (lower.includes('product hunt')) return 'competition';
  return 'market';
}

export function buildEvidenceLibrary(): EvidenceLibraryItem[] {
  const items: EvidenceLibraryItem[] = [...EXTRA_ITEMS];

  for (const topic of Object.keys(MOCK_INVESTIGATION_EVIDENCE) as InvestigationTopic[]) {
    const data = MOCK_INVESTIGATION_EVIDENCE[topic];
    for (const src of data.whySources) {
      items.push({
        id: `${topic}-${src.id}`,
        category: sourceToCategory(src.label),
        topic,
        source: src.label,
        metric: src.detail,
        interpretation: data.judgmentParagraphs[0] ?? data.verdict,
        meaning: data.aiInsight,
        whyImportant: data.evidenceBullets[0] ?? data.nextActionWhy,
      });
    }
  }

  return items;
}

export const EVIDENCE_LIBRARY_CATEGORIES: EvidenceLibraryCategory[] = [
  'market',
  'competition',
  'pricing',
  'customer',
  'technology',
  'funding',
  'trend',
  'news',
];
