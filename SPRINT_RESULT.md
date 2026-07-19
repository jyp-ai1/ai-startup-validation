# Sprint 14 — AI Startup Validation Agent Result

**Date:** 2026-07-19  
**Status:** Complete  
**Goal:** Knowledge + Validation 데이터 기반 AI 창업 컨설턴트 Agent

---

## 1. 구현 기능

| 기능 | Route | 상태 |
|------|-------|------|
| Validation Agent UI | `/projects/[id]/agent` | ✅ 질문 입력 + Recommendation |
| Multi-source Context | Agent pipeline | ✅ Research, Evidence, VOC, Competitor, Score, Knowledge |
| Knowledge Search 통합 | Context collector | ✅ 질문 기반 top-5 chunk retrieval |
| AI Recommendation | `askValidationAgent()` | ✅ decision, summary, sources, nextActions |
| Mock fallback | API key 없을 때 | ✅ Context 기반 템플릿 |
| Project → Agent CTA | Project Detail | ✅ |

---

## 2. Agent Pipeline

```text
User Question
    ↓
collectValidationAgentContext()
    ├ ValidationReportContext (7 sources)
    └ searchProjectKnowledge(question)
    ↓
buildValidationAgentContextText()
    ↓
validation-agent.ts Prompt (Startup Consultant)
    ↓
generateJSON() — OpenAI | Anthropic | Mock
    ↓
ValidationAgentOutput (Zod validated)
```

---

## 3. Output Schema

```json
{
  "recommendation": "Markdown",
  "summary": "...",
  "decision": "GO | CONDITIONAL GO | NO GO | INSUFFICIENT DATA",
  "confidence": "HIGH | MEDIUM | LOW",
  "sources": [{ "title", "source", "excerpt", "score" }],
  "nextActions": ["..."]
}
```

---

## 4. 변경 파일

### AI (`@repo/ai`)
- `src/prompts/validation-agent.ts`
- `src/validation/agent-schemas.ts`
- `src/validation/agent-context-builder.ts`
- `src/validation/agent-generator.ts`

### Types (`@repo/types`)
- `ValidationAgentContext`, `ValidationAgentOutput`, `ValidationAgentSource`

### Web (`apps/web`)
- `features/validation-agent/`
- `app/projects/[id]/agent/page.tsx`
- `features/projects/components/project-detail.tsx`

---

## 5. 테스트 결과

| Check | Result |
|-------|--------|
| `pnpm lint` | ✅ Pass |
| `pnpm --filter web build` | ✅ Pass |
| Route registered | ✅ `/projects/[id]/agent` |

---

## 6. Master Plan Status

**Sprint 0–14 전체 완료** — AI Startup Validation Framework MVP + Premium + Agent tier.

---

## Test URLs (after deploy)

```
/projects                          → 프로젝트 목록
/projects/{id}                     → Project Detail (Agent CTA)
/projects/{id}/agent               → Validation Agent
/projects/{id}/knowledge           → Knowledge Base
/projects/{id}/knowledge/query     → Knowledge Search
```

Seed project: **실버 세대 매칭 서비스**

Sample question: `"실버 시장 성장 근거는?"`
