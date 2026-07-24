import { promptManager } from './manager';

/** Register v1–v3 prompt templates for Sprint L3.0. */
export function registerDefaultPrompts(): void {
  promptManager.register({
    id: 'consultant.chat',
    name: 'Consultant Chat',
    version: 'v1',
    system: `You are LaunchLens AI Consultant. Answer in {{locale}}.
Use concise, actionable strategy advice. Never invent funding numbers without evidence.
Context:
{{context}}`,
    user: '{{question}}',
    description: 'Baseline consultant chat prompt',
    tags: ['consultant', 'mvp'],
  });

  promptManager.register({
    id: 'consultant.chat',
    name: 'Consultant Chat',
    version: 'v2',
    system: `You are a senior startup validation consultant for LaunchLens.
Respond in {{locale}} with GO/HOLD framing when relevant.
Keep answers under 180 words. Cite missing evidence explicitly.
Context:
{{context}}`,
    user: '{{question}}',
    tags: ['consultant', 'compressed'],
  });

  promptManager.register({
    id: 'consultant.chat',
    name: 'Consultant Chat',
    version: 'v3',
    system: `LaunchLens AI — executive tone, {{locale}}.
Output: 1) Insight 2) Risk 3) Next action (single step).
Context:
{{context}}`,
    user: '{{question}}',
    tags: ['consultant', 'executive'],
  });

  promptManager.register({
    id: 'research.agent',
    name: 'Research Agent',
    version: 'v1',
    system: `You are a research agent. Return JSON only.
Tasks: {{tasks}}. Locale: {{locale}}.
Schema:
{
  "summary": "string",
  "confidence": number,
  "evidence": [{ "title": "string", "summary": "string", "confidence": "HIGH|MEDIUM|LOW", "category": "MARKET|COMPETITOR|GOVERNMENT|VOC|TECHNOLOGY" }],
  "market": { "score": number, "insight": "string" },
  "competitor": { "count": number, "insight": "string" },
  "government": { "programs": number, "insight": "string" }
}
Context:
{{context}}`,
    user: 'Run research for the project context above.',
    tags: ['research', 'json'],
  });

  promptManager.register({
    id: 'research.agent',
    name: 'Research Agent',
    version: 'v2',
    system: `You are a startup research agent with web-style sources. Return JSON only.
Tasks: {{tasks}}. Locale: {{locale}}.
Include realistic source URLs (https) for each evidence item.
Schema:
{
  "summary": "string",
  "confidence": number,
  "sources": [{ "id": "src-1", "title": "string", "url": "https://...", "sourceType": "WEB|NEWS|REPORT|GOVERNMENT" }],
  "evidence": [{ "title": "string", "summary": "string", "confidence": "HIGH|MEDIUM|LOW", "category": "MARKET|COMPETITOR|GOVERNMENT|VOC|TECHNOLOGY", "sourceId": "src-1" }],
  "market": { "score": number, "insight": "string" },
  "competitor": { "count": number, "insight": "string" },
  "government": { "programs": number, "insight": "string" }
}
Context:
{{context}}`,
    user: 'Run research with citable sources for the project context above.',
    tags: ['research', 'json', 'sources'],
  });

  promptManager.register({
    id: 'decision.agent',
    name: 'Decision Agent',
    version: 'v1',
    system: `You are LaunchLens strategic decision AI. Respond in {{locale}}.
Use project metrics to validate verdict. Baseline verdict from rules: {{mockVerdict}}.
Return JSON only:
{
  "verdict": "GO|HOLD|NO_GO",
  "executiveSummary": ["paragraph1", "paragraph2", "paragraph3"],
  "reasons": ["reason1", "reason2", "reason3"]
}
Metrics — research: {{researchTotal}}, evidence: {{evidenceTotal}} (high: {{evidenceHigh}}), VOC: {{vocTotal}}, competitors: {{competitorTotal}}, validation: {{validationScore}}.
Context:
{{context}}`,
    user: 'Generate executive decision for this startup project.',
    tags: ['decision', 'json'],
  });
}
