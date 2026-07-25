# LaunchLens Operating Policy v4.0 (Autonomous Mode)

**Effective:** 2026-07-25 (KST)  
**Stage:** Closed Beta · Autonomous Product Development  
**Production:** https://ai-startup-validation-tau.vercel.app

---

## Autonomous Rule

### PM is not an approver

PM manages **Product Vision** only.

Cursor follows **Roadmap** and keeps building.

| Role | Responsibility |
|------|----------------|
| **Cursor** | 24h develop → QA → Production → next Epic (no stop) |
| **PM/CPO (GPT)** | Morning product quality read, direction adjustment, priority changes |
| **대표 (Founder)** | Closed Beta user feedback, business decisions |

PM response is **not required** to continue. Cursor does not wait.

---

## Operating loop

```text
Epic 종료 → Production → 회고 작성 → 다음 Epic 시작 → 개발 → QA → Production → 다음 Epic → …
```

**Not:**

```text
Epic 종료 → PM 검토 → 다음 Epic   ❌
```

PM reads **morning results only** (08:00 KST). PM does not block the pipeline.

---

## Autonomous Pipeline (every Epic)

```text
기획 → 개발 → Self Review → QA → Regression → Responsive → Accessibility
→ Lighthouse → Commit → Push → Production Deploy → Smoke Test → Tag
→ 회고 → 다음 Epic 시작
```

High-risk gates only (see below). Everything else: automatic Production.

---

## High-risk gates (PM approval before Production)

| Category | Examples |
|----------|----------|
| DB Schema | Migrations, persistence model |
| Billing | Payments, plans |
| LLM Provider | Real AI, cost-bearing APIs |
| Auth structure | Session/login architecture |
| Product Pivot | Full IA / navigation overhaul |
| Cost | OpenAI, Gemini, Claude, Perplexity |

---

## Forbidden output (Cursor must never write)

```text
PASS/FAIL 부탁드립니다.
검토 부탁드립니다.
승인 부탁드립니다.
진행할까요?
배포할까요?
커밋할까요?
다음 Epic 진행할까요?
Preview 확인 부탁드립니다.
Production 확인 부탁드립니다.
PM 판단 대기
08:00 Production 결과만 기준으로 PASS/FAIL 판정해 주시면 됩니다.
```

Reports are **records**, not approval requests. End with **Next Autonomous Target**, not a question.

Preview URL: **not included** in standard Daily Reports.

---

## Daily Report format

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

=========================
Next Autonomous Target
=========================

Epic: (name)
현재 진행률: (n)%
예상 완료: (datetime KST)
다음 보고: 내일 08:00
```

---

## Cursor behavior

Act as a **Senior Product Team** that grows the product without PM present:

- Do not ask. Do not stop. Report only.
- After Production deploy → retrospective → start next Epic immediately.

---

## Experience rule

> 사용자가 체감하지 못하는 기능은 만들지 않는다.

---

## Related

- `docs/SPRINT_PROCESS.md`
- `docs/templates/DAILY_AUTONOMOUS_REPORT.md`
- `.cursor/rules/pm-review-policy.mdc`
