# Sprint 4.6 — AI PM Investigation Experience

**Status:** ✅ SHIPPED  
**Mission:** AI가 "판단"을 잘하는 것이 아니라 **"조사하고 보고하는 과정"**이 신뢰를 만든다.

---

## CPO Direction (PASS WITH CHANGES on 4.5)

Reason Chain은 생겼지만 **"AI PM이 일을 했다"**는 경험이 부족했다.

| Gap | Fix |
|-----|-----|
| 조사 내용이 안 보임 | Investigation Log (타임스탬프 + 완료 항목) |
| 근거가 살아있지 않음 | Keywords · trend before/after · competitor insight · source link |
| 판단부터 시작 | Report-first: "오늘 조사한 결과" → "이를 종합하면…" |
| PDF 활용 부족 | Smart Question + citation on pricing gap |
| Generic 질문 | Document-aware Smart Question Engine |

---

## P0 Deliverables

| # | Item | Status |
|---|------|--------|
| P0-1 | **AI PM Investigation Log** — timestamped work log | ✅ |
| P0-2 | **Live Investigation** — 12s animated source scan | ✅ |
| P0-3 | **Evidence Deep Link** — keywords, trend viz, view source | ✅ |
| P0-4 | **Smart Question Engine** — document gap questions | ✅ |
| P0-5 | **PM Report** — duration, data points, opinions, decisions | ✅ |

---

## Implementation map

| Layer | File |
|-------|------|
| Types | `lib/v2-investigation-types.ts` |
| Engine | `lib/v2-investigation-engine.ts` |
| Log UI | `components/v2/v2-investigation-log.tsx` |
| Live UI | `components/v2/v2-live-investigation.tsx` |
| Smart Q | `components/v2/v2-smart-question-block.tsx` |
| PM Report | `components/v2/v2-pm-report.tsx` |
| Evidence+ | `v2-evidence-metadata-card.tsx` (deep link) |
| Demo | `v2-demo-experience.tsx` |
| Smart Intake | `v2-smart-intake-flow.tsx` |
| i18n | `investigation` · `investigationSample` |

---

## Flow changes

**Sample demo:** investigating (live 12s) → inbox (log) → opinion (report-first) → evidence (deep metadata) → continuousManagement (PM report)

**My project:** working (live) → understanding (log) → firstQuestion (smart Q + citation) → evidenceReview (report-first) → dailyPreview (PM report)

---

## Exit criteria

- User sees what AI PM investigated before any judgment
- Evidence shows why (+28% with keywords and trend)
- PDF upload triggers document-specific questions
- Review ends with PM work report (time, data count)
