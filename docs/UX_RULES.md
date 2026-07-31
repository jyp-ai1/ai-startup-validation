# LaunchLens UX Rules

> **CPO Sign-off:** Sprint P1 — UX 구조 고정 · Epic 2 Blueprint ✅ 2026-07-29  
> **Authority:** This document overrides ad-hoc layout changes. Cursor must read before any UI work.  
> **Product law:** [`PRODUCT_PRINCIPLES.md`](./PRODUCT_PRINCIPLES.md) — AI PM > Report · 3-second rule · Epic 3 implementation rules

---

## 1. Workspace는 하나만 존재한다

- **Project Workspace** (`/validation?project=:id`) is the only place users do strategy work.
- There is no second workspace, legacy shell, or parallel canvas.
- `/projects/*` and duplicate hubs are **forbidden** entry points.

## 2. 페이지를 새로 만들지 않는다

- Do **not** create `/execution`, `/strategy`, `/evidence` as standalone pages.
- Do **not** add global stub routes (`/reports`, `/research`, …).
- New capability = **section or panel inside Project Workspace**.

## 3. 모든 기능은 Workspace 안에서 해결한다

- Review, Evidence, Strategy, Execution live **inside** one canvas.
- Page navigation is minimized; **Main content swaps**, URL may use hash or query for section only.

## 4. 좌측은 AI PM 진행상황이다

- Left column = **AI PM progress tree** (Overview → ○ ● ✔ nodes).
- Tree **grows as AI PM progresses** — process-first, not document TOC.
- Node lifecycle: Waiting → In Progress → Completed → Collapsed.

## 5. 우측(Main)은 현재 작업만 보여준다

- Main shows **one focus** at a time (current section content).
- No three-column enterprise layout (Left | Center | Right).

## 6. Action은 Summary 바로 아래 이어진다

- Recommended **Next Step** appears **inline after Summary** — not as a bordered Action card.
- User reads Summary → immediately sees next step + `[ Start ]`.
- Risk and Recommendation are collapsible below — within 2–3 scrolls total.

## 7. Evidence는 보조 정보다

- Evidence is **drawer, expand, or secondary panel** — not the primary scroll.
- First screen = Summary + Action; Evidence on demand.

## 8. 사용자는 스크롤보다 클릭을 덜 해야 한다

- Prefer **click section in nav** over long vertical scroll through all sections.
- AI PM interview: progress visible in **nav tree**, not endless question stack.

---

## Layout freeze (Epic 7)

See **`docs/DESIGN_SYSTEM.md` Part 1** for the frozen GNB + Navigation + Main shell.

---

## Terminology (user-facing)

See **`docs/WORKSPACE_IA.md` §2** for full mapping.

| User sees | Internal (code/docs) | Don't say to users |
|-----------|----------------------|-------------------|
| Project Workspace | `/validation` | Validation, Dashboard |
| **Overview** | `review` | Review |
| **Insights** | `evidence` | Evidence (as nav label) |
| **Recommendations** | `strategy` | Strategy |
| **Next Actions** | `execution` | Execution, Decision Center |

Internal route `/validation` and section keys (`review`, `evidence`, …) stay in code until a rename sprint; **UI copy uses user terms only**.

---

## Before any UI PR

- [ ] Read `docs/PRODUCT_PRINCIPLES.md`, `docs/SCREEN_MAP.md`, and this file
- [ ] Read `docs/WORKSPACE_IA.md` + `docs/sprints/EPIC3_WORKSPACE_LAYOUT.md` for Epic 3
- [ ] No new routes without CPO approval
- [ ] No layout column changes without CPO approval
- [ ] QA by **user journey** + **3-second rule** (progress + next action)
