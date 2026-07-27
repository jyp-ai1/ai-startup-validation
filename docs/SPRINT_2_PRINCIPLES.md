# Sprint 2 Principles

**Sprint name:** Go To Market Foundation *(not "Landing only")*  
**Authority:** CPO · ADR-031 · Rule #0  
**Companion:** [SPRINT_2_LANDING.md](./sprints/SPRINT_2_LANDING.md) · [DESIGN_LANGUAGE.md](./DESIGN_LANGUAGE.md)

> **Sprint 1** = 제품 ✅ · **Sprint 2** = 브랜드 · **Sprint 3** = 경쟁력

**Tagline:** *Think Better. Decide Better.*

---

## Single goal (30초)

Landing을 본 사람이 이 말을 하게 만드는 것:

> **"이거 그냥 AI가 문서 써주는 게 아니네."**

---

## Sprint 2 Mission

Sprint 2의 질문:

> **"처음 보는 사람이 왜 LaunchLens를 써야 하는지 이해하는가?"**

**Unsolved after Sprint 1:** *"처음 보는 사람이 10초 안에 이해하는가?"*

Landing은 회원가입 페이지가 **아닙니다**. **생각을 팔아야 합니다.**

---

## User journey (LaunchLens — not generic SaaS)

```text
Landing

↓

"아 이거 내가 필요했던 서비스인데?"

↓

Demo (Live)

↓

Login

↓

Workspace
```

**NOT:**

```text
Landing → Login → Product
```

---

## North Star (Sprint 2 KPI)

```text
로그인하기 전에

"나도 한번 써봐야겠다."
```

---

## Why LaunchLens (Hero보다 먼저)

```text
사업 아이디어는 있는데
어디서부터 검토해야 할지 모르겠습니다.

↓

ChatGPT에 물어보면
매번 다른 답이 나옵니다.

↓

회의할 때마다
결정했던 내용이 사라집니다.

↓

LaunchLens는
생각을 이어갑니다.
```

---

## Live Demo (P0 — 읽는 Landing보다 100배)

로그인 없이 **실제로 움직이는** Demo.

```text
Open Demo
────────────
AI SaaS 검토 예시

✓ 문제
✓ 고객
✓ 시장
✓ Review Board
✓ Decision
✓ Memory
```

→ `/validation?demo=readonly` — 클릭 · 탐색 가능. 영상/GIF ✗

---

## Header IA

**비로그인**

```text
Product · Why LaunchLens · Pricing · Resources · Login · Start Free
```

**로그인**

```text
Workspace · Projects · Profile
```

Dashboard ✗ · Analytics ✗ · Settings ✗ — **Workspace = Home**

**관리자** (별도 — 사용자 IA와 절대 혼합 ✗)

```text
Dashboard · Users · Projects · Analytics · Feedback · Settings
```

---

## 반드시 하지 말 것

```
Landing에서

기능 설명          금지
AI 기능 나열       금지
SWOT / PRD / Pitch 금지
```

---

## Implementation priority (CPO)

**`/validation` 고도화보다 Sprint 2 GTM을 먼저.**

Workspace 방향은 Sprint 1에서 충분. 병목 = *"왜 이 서비스를 써야 하는가"*. Live Demo readonly wiring만 `/validation`에서 허용.

---

## Implementation gate (every feature)

[Rule #0](./PRODUCT_CONSTITUTION.md#rule-0-supreme--above-all-features) +:

1. 사용자가 **더 깊게 생각**하게 만드는가?
2. **더 나은 의사결정**을 돕는가?
3. 프로젝트 **Context를 축적**하는가?

**하나라도 아니면 만들지 않는다.**

---

## CTO note

모든 화면은 [DESIGN_LANGUAGE.md](./DESIGN_LANGUAGE.md) 기준. LaunchLens는 AI Wrapper가 아니다. **Thinking Workspace**다.
