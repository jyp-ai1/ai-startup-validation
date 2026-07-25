# LaunchLens Operating Policy v3.0

**Effective:** 2026-07-25 (KST)  
**Stage:** Closed Beta · Fully Autonomous Development  
**Production:** https://ai-startup-validation-tau.vercel.app

---

## Principle

PM/CPO sets **product direction and PASS/FAIL** on Production only.

Cursor executes the full pipeline **without approval gates** except high-risk categories below.

> **금지:** "배포할까요?", "커밋할까요?", "승인 부탁드립니다", Preview URL in standard reports.

---

## Autonomous Pipeline (every Epic)

```text
기획 → 개발 → Self Review → QA → Regression → Responsive → Accessibility
→ Lighthouse → Commit → Push → Production Deploy → Smoke Test → Tag → 다음 Epic
```

Cursor does **not** stop to ask PM unless a high-risk gate applies.

---

## PM Approval Required (only these)

| Category | Examples |
|----------|----------|
| DB Schema | Migrations, persistence model |
| Billing | Payments, plans |
| LLM Provider | Real AI, cost-bearing APIs |
| Auth structure | Session/login architecture |
| Product Pivot | Full IA / navigation overhaul |
| Cost | OpenAI, Gemini, Claude, Perplexity |

Everything else: **automatic deploy to Production**.

---

## PM Review (Production only, ~5 min)

Morning window: **08:00–09:00 KST**

| Check | Criterion |
|-------|-----------|
| Landing | 5-second test — "여기가 뭐하는 서비스죠?" must NOT appear |
| Goal → GO | First visit reaches GO in ~3 min |
| WOW | "AI와 함께 전략 프로젝트를 진행했다" memory |

Preview URL: **not reported** in standard Daily Reports.

---

## Daily Report Format

```text
=========================
LaunchLens Daily Report
=========================

Version / Commit / Production / Tag

오늘 사용자가 새롭게 느끼는 경험
오늘 개선한 UX
오늘 해결한 문제
Analytics
Known Issues
QA 결과
Production URL
내일 작업 계획
```

---

## Current Goal

**Closed Beta 2.2 — Product Completion**

Not feature addition. **Users feel WOW** — AI PM as colleague, not dashboard.

---

## Experience Rule

> 사용자가 체감하지 못하는 기능은 만들지 않는다.

---

## Related

- `docs/SPRINT_PROCESS.md`
- `.cursor/rules/pm-review-policy.mdc`
