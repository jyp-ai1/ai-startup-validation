# Sprint 2.2.2 — Decision-first Workspace

**Parent:** Sprint 2.2 Review Board & Evidence Workspace  
**Predecessor:** Sprint 2.2.1 Evidence Experience Polish (held — do not merge separately)  
**Goal:** Review Board를 **결과 화면**에서 **의사결정 Workspace**로 진화

---

## CPO Hold rationale

구조는 맞지만 아직 **"GPT 답변을 예쁘게 꾸민 화면"**처럼 보임.  
LaunchLens는 **판단 → 근거 → Action** 순서의 Thinking Workspace여야 함.

**UI 원칙:** 대표가 3초 안에 *"지금 무엇을 판단해야 하는지"* 이해할 수 있어야 한다.

---

## Must ship (P0)

| # | Item | Key files |
|---|------|-----------|
| 1 | Evidence Drawer: **판단 → 근거 → Action → AI 질문** | `v2-evidence-detail-drawer.tsx` |
| 2 | Review Board: **판단 · 근거 · 다음 행동** 3단 회의록 | `v2-investigation-board.tsx` |
| 3 | Impact Analysis: 입력 변경 시 **영향도 자동 표시** | `v2-impact-analysis.ts`, `v2-impact-analysis-panel.tsx` |
| 4 | Evidence Summary Strip: **★ 신뢰도** 한눈에 + Drawer 연동 | `v2-evidence-summary-strip.tsx`, `v2-star-rating.tsx` |
| 5 | Next Action: CTA에 **왜 필요한지** 항상 표시 | `v2-next-action-block.tsx` |

---

## Layout order (main panel)

```
Header → Thinking Loop → Impact (if stale) → Stale banner
→ Thinking Map → Chips → Next Action
→ Evidence Summary Strip (★)
→ Review Board (meeting minutes)
```

---

## Acceptance

- [ ] 3초 안에 다음 행동 이해
- [ ] AI가 왜 그렇게 판단했는지 설명 가능 (Drawer)
- [ ] 입력 변경 → Impact Analysis 즉시 표시
- [ ] Review Board만 봐도 현재 상태 + 다음 결정 명확
- [ ] 10초 Wow: *"와… 이건 그냥 GPT가 아니네"*

**Status:** 🔄 IN PROGRESS (CPO hold — no merge until sign-off)

---

## P0.9 — Signature Experience (Sprint 2 finale)

| # | Item |
|---|------|
| 1 | Decision Memory **Story Mode** (not timeline) |
| 2 | Review Board **최근 변경** per card |
| 3 | Evidence **Trend** (↑ ↓ →) on strip + cards |
| 4 | Next Action **priority · time · expected effect** |
| 5 | **AI Confidence** on all judgments |

**Goal:** *"내 프로젝트가 AI와 함께 점점 똑똑해지고 있다"*

**Status:** 🔄 IN PROGRESS
