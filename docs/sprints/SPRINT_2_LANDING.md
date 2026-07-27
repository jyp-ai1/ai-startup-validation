# Sprint 2 — Landing Experience

**Status:** ⬜ PLANNED (after Sprint 1.6 CPO PASS)  
**Authority:** [LAUNCHLENS_ROADMAP_V1.md](../LAUNCHLENS_ROADMAP_V1.md) v1.1 · ADR-029

---

## Sprint question

> 처음 보는 사람도 **30초** 안에 서비스를 이해할까?

---

## User journey

```text
Landing → 서비스 이해 → Demo → 로그인 → Workspace
```

---

## Header IA (비로그인)

```text
LaunchLens | Product · Pricing · Resources | Login · Start Free
```

## Header IA (로그인 — Landing 메뉴 제거)

```text
Workspace · Projects · Profile
```

Post-login redirect: `/workspace`

---

## Sections (order)

### Hero (P0)

```text
사업계획서를 만들어주는 AI는 많습니다.

당신의 의사결정을
끝까지 함께 고민하는 AI는 드뭅니다.
```

**CTA:** `무료로 시작하기` · `데모 보기`

---

### Product (P0)

"LaunchLens는 무엇인가" — 3 cards

| Card | |
|------|---|
| Thinking Engine | |
| Decision Memory | |
| Evidence Review | |

---

### How it Works (P0)

3 steps only:

```text
아이디어 입력 → AI와 함께 생각 → Decision Memory 저장
```

---

### Demo (P1)

Workspace GIF or scroll demo (real `/validation` capture)

---

### Pricing (P2)

Free · Pro · Business — copy later, structure now

---

### FAQ (P2)

5 questions

---

### Footer (P1)

---

## Out of scope

- Real AI (Sprint 3)
- Artifacts menu (Sprint 4)
- Billing logic (Sprint 6)
- Admin (Sprint 7)

---

## Ship

Release Rule — Preview URL · Before/After · QA · User Scenario

---

## Success

30초 가치 이해 — YES on Preview without login
