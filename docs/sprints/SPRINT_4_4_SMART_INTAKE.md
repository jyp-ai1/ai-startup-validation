# Sprint 4.4 — AI PM Smart Intake & First Working Experience

**Status:** 🔄 IN PROGRESS  
**Mission:** 사용자는 새로 작성하지 않는다. AI PM은 먼저 이해하고, 부족한 부분만 질문한다.

---

## Product Constitution

| Rule | Principle |
|------|-----------|
| #1 | AI는 문서를 대신 작성하지 않는다 — 대표의 생각을 이해한다 |
| #2 | 입력이 아니라 **Context Import**가 시작 |
| #3 | "더 작성하세요" ❌ → "이 부분만 보완하면 됩니다." ✅ |

---

## P0 Deliverables (Phase 1)

| # | Item | Status |
|---|------|--------|
| P0-1 | Smart Intake — Paste First + PDF/DOCX/TXT/MD upload | ✅ |
| P0-2 | 500자 Textarea + 글자 수 | ✅ |
| P0-3 | AI PM Working Animation (9s, 7 steps) | ✅ |
| P0-4 | Document Understanding — extracted / missing / quality | ✅ |
| P0-5 | First AI Question — pricing selection | ✅ |
| P0-6 | Evidence-first recommendation + why | ✅ |
| P0-7 | Practical Resources accordion | ✅ |
| P0-8 | Decision Improvement Before/After | ✅ |
| P0-9 | Daily Monitoring Preview | ✅ |
| P0-10 | Demo → save → login (unchanged from 4.3) | ✅ |

---

## Implementation map

| Layer | File |
|-------|------|
| Types | `lib/v2-smart-intake-types.ts` |
| Engine | `lib/v2-smart-intake-engine.ts` |
| Data | `lib/v2-smart-intake-data.ts` |
| UI flow | `components/v2/v2-smart-intake-flow.tsx` |
| Demo wiring | `v2-demo-experience.tsx` |
| Draft promotion | `v2-demo-project-store.ts` · `my-project-actions.ts` |
| i18n | `ia.thinkingUx.smartIntake` |

---

## Demo flow (My Project segment)

```
tryMyProject → smartIntake (paste) → working (9s)
→ documentUnderstanding → firstQuestion (pricing)
→ evidenceFirstReview → myProjectImprovement
→ dailyMonitoringPreview → savePrompt → loginCta
```

---

## Phase 2+ (out of scope)

PPTX · HWP · multi-doc merge · Notion/Confluence/Google Docs API

---

## Exit criteria

- Paste or upload starts a project without blank forms
- AI PM shows understanding + asks only for gaps
- Recommendations include evidence + reasoning
- Login only at save step; demo draft promotes to workspace
