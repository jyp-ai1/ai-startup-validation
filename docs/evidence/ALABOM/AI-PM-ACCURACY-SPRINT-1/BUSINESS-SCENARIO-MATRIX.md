# Business Scenario Matrix (Sprint 2 · Track B)

**15 businesses** · sets: Development 01–10 · Regression 11–13 · Unseen 14–15

Machine source: `apps/web/lib/ai-pm-accuracy/business-scenario-matrix.ts`

| # | ID | Type | Example | Set |
|---|-----|------|---------|-----|
| 01 | biz-01 | B2B SaaS | 중소기업 업무관리 | development |
| 02 | biz-02 | B2C SaaS | 개인 생산성 | development |
| 03 | biz-03 | AI SaaS | AI 문서/분석 | development |
| 04 | biz-04 | Marketplace | 전문가 매칭 | development |
| 05 | biz-05 | Commerce | D2C 식품 | development |
| 06 | biz-06 | D2C Brand | 화장품 | development |
| 07 | biz-07 | Local | 지역 F&B | development |
| 08 | biz-08 | Healthcare | 병원 예약 | development |
| 09 | biz-09 | Education | 온라인 교육 | development |
| 10 | biz-10 | Content | 미디어 | development |
| 11 | biz-11 | Community | 직군 커뮤니티 | regression |
| 12 | biz-12 | Platform/API | 개발자 API | regression |
| 13 | biz-13 | Hardware+SaaS | IoT | regression |
| 14 | biz-14 | Professional Service | 컨설팅 | **unseen** |
| 15 | biz-15 | Offline | 오프라인 매장 | **unseen** |

Each row includes `initialFields` (KNOWN/PARTIAL/UNKNOWN/…) and intake `documentText`. **Question order is not fixed** — pilots use perturbation scripts; CPO judges L4 priority from captured `actualNextQuestion`.

Regenerate harness: `cd apps/web && pnpm test:multi-business-accuracy`
