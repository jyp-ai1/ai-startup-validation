# UX QA Template — Product QA (5 questions)

> Bug QA is baseline. **Product QA = exactly 5 questions.** All must PASS.

Constitution: [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md)

---

## Sprint metadata

| Field | Value |
|-------|-------|
| Epic | |
| Sprint | |
| Preview URL | |
| Tester | PM |
| Date | |

---

## Product QA — 5 questions (all required)

| # | Question | Pass? | Notes |
|---|----------|-------|-------|
| 1 | | ☐ | |
| 2 | | ☐ | |
| 3 | | ☐ | |
| 4 | | ☐ | |
| 5 | | ☐ | |

### Epic 1 default set (use unless PM overrides)

1. **5초** 안에 서비스 목적을 이해하는가?
2. 다음 행동을 **고민하지 않는가**?
3. 메뉴를 찾지 않고 **Workflow를 따라가는가**?
4. AI 추천이 **자연스러운가**?
5. **계속 진행하고 싶은가**?

---

## UX Laws checklist (constitution)

- [ ] Primary nav ≤ 7 items
- [ ] One primary CTA per screen
- [ ] AI shows next recommended action
- [ ] Screen purpose clear within 30 seconds
- [ ] Workflow visible before feature lists

---

## Functional regression (baseline)

- [ ] `pnpm lint && pnpm build`
- [ ] `node .tmp/smoke-prod.mjs` (when deployable)
- [ ] `/auth/login` · `/demo/enter` (if touched)

---

## Result

| | |
|-|-|
| **Product QA (5/5)** | ☐ PASS · ☐ FAIL |
| **UX Laws** | ☐ PASS · ☐ FAIL |
| **Blocking** | |

**PM sign-off:** _______________ **Date:** _______________
