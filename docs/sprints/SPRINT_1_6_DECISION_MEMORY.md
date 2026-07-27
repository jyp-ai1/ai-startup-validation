# Sprint 1.6 — Decision Memory

**Status:** 📋 ACTIVE  
**Authority:** [LAUNCHLENS_ROADMAP_V1.md](../LAUNCHLENS_ROADMAP_V1.md) v1.1 · ADR-029

---

# Sprint 1.6 Principle

Decision Memory는 히스토리를 저장하는 기능이 아니다.

**대표의 사고(Context)를 이어주는 기능**이다.

사용자는 과거를 조회하기 위해 들어오는 것이 아니라,

**'어디서부터 다시 생각해야 하는가'**를 알기 위해 돌아온다.

모든 UI와 기능은 이 원칙을 만족해야 한다.

---

## Sprint question (Sprint 1)

> 어떻게 하면 사용자가 **생각**하게 만들까?

**1.6 completes:** 프로젝트가 기억한다 (AI가 기억 ✗)

---

## Goal

```
질문 → 생각 → 결정 → 기억 → 다음날 이어서 생각
```

**NOT:** ChatGPT Q&A end · AI auto-decides · Timeline · memo pad

---

## Data structure (immutable)

```text
Decision → Reason → Evidence → Date → Status
```

| Field | Example |
|-------|---------|
| Decision | B2B SaaS로 간다 |
| Reason | CAC가 낮다 |
| Evidence | 시장 조사 · 인터뷰 · 경쟁사 |
| Date | 2026.07.27 |
| Status | Current / Superseded (never delete) |

---

## UI (no new top-level menu)

**Workflow nav below** — new section:

```text
Decision Memory
● B2B SaaS 채택
● 월 구독 모델
```

Click → **Main** shows decision detail (not timeline).

---

## AI role (Sprint 1.6)

AI asks — **does not auto-save:**

```text
대표님. 이번 결정을 Decision Memory에 저장할까요?
[저장] [나중에]
```

Flow: 추천 → 대표 확인 → Memory 저장

---

## Success criteria (CPO — day after)

| # | Question |
|---|----------|
| ① | 내가 **왜** 이 결정을 했는지 기억난다 |
| ② | **다음에** 무엇을 고민해야 하는지 안다 |
| ③ | ChatGPT가 아니라 **내 프로젝트**를 이어가는 느낌 |

---

## Out of scope

- Real AI reasoning (Sprint 3)
- Landing (Sprint 2)
- Context recall across sessions with AI (Sprint 2+)

---

## Ship

Release Rule · User Scenario: revisit next day → see Decision Memory → continue thinking

---

## Pre-Sprint 2 note (CPO)

[LAUNCHLENS_DESIGN_SYSTEM_1_0.md](../LAUNCHLENS_DESIGN_SYSTEM_1_0.md) — grid · spacing · panel structure before Landing
