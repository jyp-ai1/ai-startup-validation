# Sprint 4 — AI PM Working Experience

**Status:** 🔄 IN PROGRESS (direction reset per CPO)  
**Sprint type:** Product validation — **AI PM이 실제로 일하는 것처럼 느껴지는 경험**  
**Previous name:** AI PM Experience / Consulting Experience → superseded

---

## CPO diagnosis

| Layer | Status |
|-------|--------|
| 제품 철학 | ✅ |
| UX 구조 | ✅ |
| 컴포넌트 | ✅ |
| **AI 경험** | △ — 보고만 하고, PM처럼 일하지 않음 |

**HOLD signal:** *"AI가 분석 결과를 보여주는 서비스네."*  
**PASS signal:** *"AI가 오늘 나 대신 일을 해왔고, 나는 그 결과를 검토하고 다음 결정을 내리는구나."*

---

## Mission

> LaunchLens = `AI PM → 업무 수행 → 보고 → 대표 질문 → 의사결정`  
> NOT `GPT → 답변`

Sprint 4 **starts with Conversation Engine**, but the felt experience is **Working PM** — visible tasks, completed work, opinion, evidence, founder decision, next work.

---

## What we do NOT build

- Evidence++ / Drawer++ / Panel++ / Chart++
- New workflow nav or menus
- More dashboard surfaces

All P0 lives **inside existing AI PM Inbox** — one column, six blocks.

---

## P0 — Six blocks (Inbox)

| # | Block | Example |
|---|-------|---------|
| ① | **업무 현황** | 시장 조사 ✅ · 경쟁 분석 진행중 · 가격 검토 대기 |
| ② | **오늘 완료한 업무** | ✓ Google Trends · ✓ Reddit · ✓ 경쟁사 8개 비교 |
| ③ | **AI PM 의견** | "시장보다 가격이 더 위험합니다. 경쟁사는 29달러…" |
| ④ | **왜?** | Google Trends · Product Hunt · YC · Crunchbase |
| ⑤ | **대표 결정** | "가격을 수정하겠습니다" → 회의록 저장 |
| ⑥ | **다음 업무** | "고객 인터뷰 진행 · 5분" + 단일 CTA |

---

## Post-review gap (must solve)

After review, founder must **not** ask *"이제 뭐하지?"*

AI PM closes the loop:

```
이번 검토는 끝났습니다.
하지만 고객 인터뷰가 없습니다.
사업성 판단이 어렵습니다.
다음 단계로 넘어가시겠습니까?
[인터뷰 질문 생성]
```

---

## Implementation map

| Layer | File |
|-------|------|
| Work engine | `lib/v2-ai-pm-work-engine.ts` |
| Inbox UI (6 blocks) | `components/v2/v2-ai-pm-working-experience.tsx` |
| Orchestrator | `v2-ai-pm-inbox.tsx` |
| Evidence why | Existing `V2WhySourcesSection` — linked from block ④ |
| Artifact offer | Block ⑥ CTA only — no separate artifact panel |

---

## P1 (after PASS)

- Real Evidence Engine API → block ② items from `@repo/evidence`
- LLM Conversation Engine (multi-turn, not sample buttons)
- Artifact auto-generation
- Team collaboration

---

## Completion criteria

1. Founder sees **what PM work is in progress** (not workflow steps).
2. Founder sees **what AI did today** (checklist, not abstract "조사했습니다").
3. AI gives **opinion with reasoning**, not section headers.
4. Every opinion links to **why / sources** or states gap.
5. Founder records **decision** → meeting note.
6. AI proposes **one next work** with ETA — no "이제 뭐하지?"

---

## Related

- [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md)
- ADR-034 · ADR-035 (Working Experience reset)
- [SPRINT_3_4_AI_PM_INBOX.md](./SPRINT_3_4_AI_PM_INBOX.md)
