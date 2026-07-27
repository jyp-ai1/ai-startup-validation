# CPO Review — Evidence Flow (2026-07-27)

**Reviewer:** CPO  
**Scope:** V2 validation flow (`/validation` → `/investigate` → `/conclusion`)  
**Verdict:** Product thinking flow is wrong — not UI polish

---

## Core diagnosis

Current flow:

```text
아이디어 입력 → AI 조사 → 60% → Hold
```

Problem: **AI has no evidence to judge.** A one-line idea → arbitrary score destroys trust ("뭘 보고?").

Required flow:

```text
Idea → Evidence 수집 → AI 조사 → 결과 → 보완 → (loop)
```

---

## P0 fixes (accepted)

| # | Requirement | Status |
|---|-------------|--------|
| 1 | AI 조사 버튼 항상 노출 | ✅ Sprint 1.3 start |
| 2 | 문제/고객/MVP/가격 — 클릭 시 Accordion 입력 | ✅ |
| 3 | 41%/60%/GO/HOLD 제거 → 근거 중심 메시지 | ✅ validation + conclusion |
| 4 | "밤새 조사" 등 허구 문구 삭제 | ✅ research + AI PM copy |
| 5 | 결과: 발견 → AI 의견 → 왜? → 추가 입력 | ✅ conclusion reorder |
| 6 | 결과는 끝이 아니라 다음 행동 유도 | ✅ improve loop CTA |

---

## Sprint pivot

| Before | After |
|--------|-------|
| Sprint 1.3 Adaptive Thinking Engine | **Sprint 1.3 Evidence-driven Validation Loop** |
| Goal: smarter AI | Goal: user understands **why** results appear |

---

## Relation to Sprint 1.2

Sprint 1.2 (`/my-projects` interview) aligns philosophically — question-first, no scores, mock context.

V2 demo path (`/validation`) had **score-first anti-patterns** — fixed in 1.3 P0 before merging flows.

---

## CPO post-fix review questions

1. Evidence 없이 조사 버튼을 눌러도 "왜 이런 결과?"가 이해되는가?
2. Accordion 입력이 버그처럼 느껴지지 않는가?
3. 결과 후 "추가 입력" 루프가 자연스러운가?
4. LaunchLens가 "점수 AI"가 아닌 "증거 기반 검증"으로 느껴지는가?
